// ==UserScript==
// @name        CSS-fixer
// @namespace   http://www.hallvord.com
// @description Scans for and fixes -webkit-prefixed CSS
// @include     http://*
// @include     https://*
// @version     1
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_log
// @require    http://hallvord.com/temp/moz/css-browserside.js
// @run-at document-end
// ==/UserScript==

var fixedElms=[];
function doTheBigStyleFixing(){    
    var fixupStyle = {"type": "stylesheet", stylesheet: {rules: []}};
    //GM_log('GM CSS fixed running '+document.styleSheets.length);

    for(var el, i = document.styleSheets.length - 1; i>=0; i--){
        el = document.styleSheets[i];
        if(fixedElms.indexOf(el.ownerNode)>-1)continue;
        if(/style/i.test(el.ownerNode.tagName)){
            var rules = createFixupRulesFromCSS(stripHTMLComments(el.ownerNode.textContent));
            fixupStyle.stylesheet.rules = fixupStyle.stylesheet.rules.concat(rules);
            GM_addStyle(css.stringify(fixupStyle));
            fixedElms.push(document.styleSheets[document.styleSheets.length - 1]); // GM_addStyle inserts a <style> element, which doesn't need fixing later on..
        }else if(el.ownerNode.href){
            GM_xmlhttpRequest({method:'GET',url:el.ownerNode.href, onload:function(response){
               var rules = createFixupRulesFromCSS(response.responseText, el.ownerNode.href);
                GM_addStyle(css.stringify({"type": "stylesheet",stylesheet:{rules:rules}}));
                fixedElms.push(document.styleSheets[document.styleSheets.length - 1]); // GM_addStyle inserts a <style> element, which doesn't need fixing later on..
            }, headers:{'Accept':'text/css'}});
        }else{
           GM_log('hm.. '+ el);
        }
        fixedElms.push(el.ownerNode);
    }
}

window.addEventListener('DOMContentLoaded', doTheBigStyleFixing, false);
window.addEventListener('load', doTheBigStyleFixing, false);

function createFixupRulesFromCSS(str, cssURL){
    try{
        var obj = css.parse(stripHTMLComments(str));
    }catch(e){
        GM_log('failed to parse '+str);
        return [];
    }
    var fixupRules = [], fixupDeclarations, prop, value;
    for(var rule, i = 0; rule = obj.stylesheet.rules[i]; i++){
       // rule.type, rule.selectors, rule.declarations
        if(rule.declarations){
            fixupDeclarations = [];
            for(var decl, j = 0; decl = rule.declarations[j]; j++){
               // decl.type, decl.property, decl.value
               prop = '', value = '';
                if(decl.property === 'display' && /box$/.test(decl.value) || /(box-|flex-)/.test(decl.property)){
                    var tmp = createFixupFlexboxDeclaration(decl, rule.declarations);
                    prop = tmp.property, value = tmp.value;
                }else{
                    if(/-webkit-/.test(decl.property)){
                       prop = decl.property.substr(8);
                    }
                    if(/-webkit-/.test(decl.value)){
                        value = decl.value.replace(/-webkit-/g, '');
                    }
                }
                if(prop || value){
                    prop = prop || decl.property;
                    value = value||decl.value
                    var existingValue = getValueForProperty(rule.declarations.concat(fixupDeclarations), prop, false);
                    if (existingValue === value) { // The declaration we want to add already exists
                        continue;
                    }else if(existingValue !== undefined){ // now it gets complicated. There is a declaration for the property we want to add, but the value is different..
                        GM_log('Whoa, Sir! We want to add "' + prop + ':' + value +'", but found "' + prop + ':' + existingValue +'"');

                    }
                    fixupDeclarations.push({type:'declaration', property:prop, value:value});
                }
            }
            if(fixupDeclarations.length > 0){
                fixupRules.push({type:'rule', selectors:rule.selectors.concat([]), declarations:fixupDeclarations.concat([])});
            }
        }
    }
    //GM_log('created fixup rules'+'\n'+JSON.stringify(fixupRules));
    return fixupRules;
}

function createFixupFlexboxDeclaration(decl, parent){
    var propname = decl.property, value = decl.value;
    // remove -webkit- prefixing from names, values
    if(/^-webkit-/.test(propname)){
        propname = propname.substr(8);
    }
    if(/^-webkit-/.test(value)){
        value = value.substr(8);
    }
    
    var mappings = {
        'display':{
            valueMap: {
                'box':'flex',
                'flexbox':'flex',
                'inline-box':'inline-flex',
                'inline-flexbox':'inline-flex'
            }
        },
        'box-align':{
            newName: 'align-items', 
            valueMap:{
                'start': 'flex-start',
                'end': 'flex-end'
            }
        },
        'flex-direction':{
            valueMap:{
                'lr': 'row',
                'rl': 'row-reverse',
                'tb': 'column',
                'bt': 'column-reverse'
            }  
        },
        'box-pack':{
            newName:'justify-content',
            valueMap:{
                    'start': 'flex-start',
                    'end': 'flex-end',
                   'justify': 'space-between'
                }
         }, 
        'box-ordinal-group':{
            newName:'order',
            valueMap:{}
        }, 
        'box-flex':{
            newName:'flex',
            valueMap:{}
        }
    };
    
    mappings['flex-align'] = mappings['box-align']; // 2009 => 2011
    mappings['flex-order'] = mappings['box-ordinal-group']; // 2009 => 2011
    
    if(propname in mappings){
        if(value in mappings[propname].valueMap){
           value = mappings[propname].valueMap[value];
        }
        propname = mappings[propname].newName || propname;
    }
    // some stuff is more complicated than a simple substitution..
    // box-flex:0 maps to 'none', other values need 'auto' appended - thanks to Daniel Holbert
    if(decl.property === 'box-flex'){
        if(decl.value == 0){
            value = 'none';
        }else{
           value = decl.value+' auto';
        }
    }
    // box-direction, box-orient is a bit of a mess - these two 2009 draft values turn into 2011's flex-direction, which again has different values for final spec
    if(propname === 'box-direction' || propname === 'box-orient'){
        var dir, orient;
        if(propname === 'box-direction'){
            dir = value;
            orient = getValueForProperty(parent, 'box-orient', true);
        }else {
            orient = value;
            dir = getValueForProperty(parent, 'box-direction', true);
         }
        // horizontal,normal => row, vertical,normal => column. horizontal,reverse => row-reverse etc..
        // lr, rl etc are handled by the simpler mapping above, so we don't need to worry about those
        value = orient === 'vertical' ? 'column' : 'row';
        if(dir === 'reverse'){
           value += '-reverse';
        }
        propname = 'flex-direction';
    }
    
    
    return {type:'declaration', property:propname, value:value};
}

function getValueForProperty(declarations, property, prefixAgnostic){
    for(var i=0;i<declarations.length;i++){
       if(declarations[i].property == property || (prefixAgnostic && declarations[i].property.substr(8) == property)) return declarations[i].value;
    }
}

function stripHTMLComments (str) {
    str = str.replace(/^\s*<!--/, '');
    str = str.replace(/-->\s*$/, '');
    return str;
}

// unsafeWindow.CSS2Properties.prototype.__defineSetter__('background-image', function(str){this['backgroundImage']=str;})
