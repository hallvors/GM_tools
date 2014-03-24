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
var warnAgainstPotentiallyOverwrittenValues = false;
// CSS property list, thanks to Jens Meiert. Extracted from http://meiert.com/en/indices/css-properties/ with this JS:
// var props = []; for(var elms = document.querySelectorAll('a code'),el,i=0; el=elms[i]; i++){props.push(el.textContent)}; JSON.stringify(props)
var allW3CSSProperties = ["align-content","align-items","align-self","alignment-adjust","alignment-baseline","all","anchor-point","animation","animation-delay","animation-direction","animation-duration","animation-fill-mode","animation-iteration-count","animation-name","animation-play-state","animation-timing-function","appearance","azimuth","backface-visibility","background","background-attachment","background-clip","background-color","background-image","background-origin","background-position","background-repeat","background-size","baseline-shift","binding","bleed","bookmark-label","bookmark-level","bookmark-state","bookmark-target","border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-decoration-break","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side","chains","clear","clip","clip-path","clip-rule","color","color-interpolation-filters","color-profile","column-count","column-fill","column-gap","column-rule","column-rule-color","column-rule-style","column-rule-width","column-span","column-width","columns","contain","content","counter-increment","counter-reset","crop","cue","cue-after","cue-before","cursor","direction","display","dominant-baseline","drop-initial-after-adjust","drop-initial-after-align","drop-initial-before-adjust","drop-initial-before-align","drop-initial-size","drop-initial-value","elevation","empty-cells","filter","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","float-offset","flood-color","flood-opacity","flow-from","flow-into","font","font-family","font-feature-settings","font-kerning","font-language-override","font-size","font-size-adjust","font-stretch","font-style","font-synthesis","font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-variant-position","font-weight","grid","grid-area","grid-auto-columns","grid-auto-flow","grid-auto-position","grid-auto-rows","grid-column","grid-column-end","grid-column-start","grid-row","grid-row-end","grid-row-start","grid-template","grid-template-areas","grid-template-columns","grid-template-rows","hanging-punctuation","height","hyphens","icon","image-orientation","image-resolution","ime-mode","inline-box-align","justify-content","justify-items","justify-self","left","letter-spacing","lighting-color","line-break","line-height","line-stacking","line-stacking-ruby","line-stacking-shift","line-stacking-strategy","list-style","list-style-image","list-style-position","list-style-type","margin","margin-bottom","margin-left","margin-right","margin-top","marker-offset","marks","mask","mask-box","mask-box-outset","mask-box-repeat","mask-box-slice","mask-box-source","mask-box-width","mask-clip","mask-image","mask-origin","mask-position","mask-repeat","mask-size","mask-source-type","mask-type","max-height","max-lines","max-width","min-height","min-width","move-to","nav-down","nav-index","nav-left","nav-right","nav-up","object-fit","object-position","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom","padding-left","padding-right","padding-top","page","page-break-after","page-break-before","page-break-inside","page-policy","pause","pause-after","pause-before","perspective","perspective-origin","pitch","pitch-range","play-during","position","presentation-level","quotes","region-fragment","rendering-intent","resize","rest","rest-after","rest-before","richness","right","rotation","rotation-point","ruby-align","ruby-overhang","ruby-position","ruby-span","shape-image-threshold","shape-outside","shape-margin","size","speak","speak-as","speak-header","speak-numeral","speak-punctuation","speech-rate","stress","string-set","tab-size","table-layout","target","target-name","target-new","target-position","text-align","text-align-last","text-combine-horizontal","text-decoration","text-decoration-color","text-decoration-line","text-decoration-skip","text-decoration-style","text-emphasis","text-emphasis-color","text-emphasis-position","text-emphasis-style","text-height","text-indent","text-justify","text-orientation","text-outline","text-overflow","text-shadow","text-space-collapse","text-transform","text-underline-position","text-wrap","top","transform","transform-origin","transform-style","transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi","vertical-align","visibility","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate","voice-stress","voice-volume","volume","white-space","widows","width","word-break","word-spacing","word-wrap","wrap-flow","wrap-through","writing-mode","z-index"];

function doTheBigStyleFixing(){    
    //GM_log('GM CSS fixed running '+document.styleSheets.length);

    for(var el, i = document.styleSheets.length - 1; i>=0; i--){
        el = document.styleSheets[i];
        var fixupStyle = {"type": "stylesheet", stylesheet: {rules: []}};
        if(fixedElms.indexOf(el.ownerNode)>-1)continue;
        if(/style/i.test(el.ownerNode.tagName)){
            var rules = createFixupRulesFromCSS(stripHTMLComments(el.ownerNode.textContent));
            copyJSDefinedStyles(rules, fixupStyle);
            //fixupStyle.stylesheet.rules = fixupStyle.stylesheet.rules.concat(rules);
            var cssStr = css.stringify(fixupStyle);
            if(cssStr !== ''){
                GM_log('will insert: \n'+css.stringify(fixupStyle));
                GM_addStyle(cssStr);
                fixedElms.push(document.styleSheets[document.styleSheets.length - 1]); // GM_addStyle inserts a <style> element, which doesn't need fixing later on..
            }
        }else if(el.ownerNode.href){
            GM_xmlhttpRequest({method:'GET',url:el.ownerNode.href, onload:function(response){
                var fixupStyle = {"type": "stylesheet", stylesheet: {rules: []}};
                var rules = createFixupRulesFromCSS(response.responseText);
                copyJSDefinedStyles(rules, fixupStyle);
                var cssStr = css.stringify(fixupStyle);
                if(cssStr !== ''){
                    GM_log('will insert: \n'+css.stringify(fixupStyle));
                    GM_addStyle(cssStr);
                    fixedElms.push(document.styleSheets[document.styleSheets.length - 1]); // GM_addStyle inserts a <style> element, which doesn't need fixing later on..
                }
            }, headers:{'Accept':'text/css'}});
        }else{
           GM_log('hm.. '+ el);
        }
        fixedElms.push(el.ownerNode);
    }
}

window.addEventListener('DOMContentLoaded', doTheBigStyleFixing, false);
window.addEventListener('load', doTheBigStyleFixing, false);

function createFixupRulesFromCSS(str){
    try{
        var obj = css.parse(stripHTMLComments(str));
    }catch(e){
        GM_log('failed to parse '+str);
        return [];
    }
    var fixupRules = [], fixupDeclarations, prop, value;
    for(var rule, i = 0; rule = obj.stylesheet.rules[i]; i++){
        insertFixupDeclarations(rule);
    }
    function insertFixupDeclarations(rule){
       // rule.type, rule.selectors, rule.declarations (rule.comment, rule.media)
        if(rule.declarations){
            fixupDeclarations = [];
            for(var decl, j = 0; decl = rule.declarations[j]; j++){
               // decl.type, decl.property, decl.value
               prop = '', value = '';
               // sometimes sites include a background fallback colour but in the *same* declaration as -webkit-gradient.
               // It is better practise to have a separate 'background' declaration for the fallback colour. Let's add it.
               if(decl.property === 'background' && /(#\w{3,6})\s*-webkit-/.test(decl.value)){ // TODO: in reality, the color and -webkit-foo() could be in any order.. is this a problem?
                    fixupDeclarations.push({type:'declaration', property:'background', value:RegExp.$1, _fxjsdefined:true});
                    decl.value = decl.value.replace(/(#\w{3,6})\s*-webkit-/, '-webkit-');
               }
                if(decl.property === 'display' && /box$/.test(decl.value) || /(box-|flex-)/.test(decl.property)){
                    var tmp = createFixupFlexboxDeclaration(decl, rule.declarations);
                    prop = tmp.property, value = tmp.value;
                }else if(/-webkit-gradient/i.test(decl.value)){
                    var tmp = createFixupGradientDeclaration(decl, rule.declarations);
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
                    value = value || decl.value
                    if(hasDeclaration(fixupDeclarations.concat(rule.declarations), prop, value, false, true))continue;
                    if(warnAgainstPotentiallyOverwrittenValues){
                        var existingValue = getValueForProperty(fixupDeclarations.concat(rule.declarations), prop, false);
                        if(existingValue !== undefined && !/(-webkit-|box)/.test(existingValue)){ // now it gets complicated. There is a declaration for the property we want to add, but the value is different..
                            GM_log('Whoa, Sir! We want to add "' + prop + ':' + value +'", but found "' + prop + ':' + existingValue +'"');

                        }                       
                    }
                    // We follow the standards - better not to pseudo-standardise -webkit-something
                    if(allW3CSSProperties.indexOf(prop) === -1)continue;
                    fixupDeclarations.push({type:'declaration', property:prop, value:value, _fxjsdefined:true});
                    // extra gotcha: per Gecko's reading of the spec, border-image will only appear if border-style or border-width is set..
                    if(prop === 'border-image' && getValueForProperty(fixupDeclarations.concat(rule.declarations), 'border-style', false) === undefined){
                        fixupDeclarations.push({type:'declaration', property:'border-style', value:'solid', _fxjsdefined:true});
                    }
                }
            }// done iterating declarations in this rule
            if(fixupDeclarations.length > 0){
                rule.declarations = rule.declarations.concat(fixupDeclarations); // add our custom declarations to the end of the current rules
            }
        }else if(rule.rules){
            for (var k = 0; k < rule.rules.length; k++) {
                insertFixupDeclarations(rule.rules[k]);
            };
        }
    }
    return obj;
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
    if(propname === 'flex'){
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
    
    
    return {type:'declaration', property:propname, value:value, _fxjsdefined:true};
}

function createFixupGradientDeclaration(decl, parent){
    var value = decl.value, newValue='', prop = decl.property.replace(/-webkit-/, '');
    // -webkit-gradient(<type>, <point> [, <radius>]?, <point> [, <radius>]? [, <stop>]*)
    // fff -webkit-gradient(linear,0 0,0 100%,from(#fff),to(#f6f6f6));
    var m = value.match(/-webkit-gradient\s*\(\s*(linear|radial)\s*(.*)\)(.*)/), points=[], toColor, stops=[];
    if(m){ // yay, really old syntax...
        // extracting the values..
        var parts = oldGradientParser(value), type; //GM_log(JSON.stringify(parts, null, 2))
        for(var i = 0; i < parts.length; i++){
            if(parts[i].name === '-webkit-gradient'){
                type = parts[i].args[0].name;
                newValue += type + '-gradient('; // radial or linear
            }
            stops = [];
            if(type === 'linear'){
                // linear gradient, args 1 and 2 tend to be start/end keywords
                points = [].concat(parts[i].args[1].name.split(/\s+/), parts[i].args[2].name.split(/\s+/)); // example: [left, top, right, top]
                if(points[1] === points[3]){ // both 'top' or 'bottom, this linear gradient goes left-right
                    newValue += 'to ' + points[2];
                }else if(points[0] === points[2]){ // both 'left' or 'right', this linear gradient goes top-bottom
                    newValue += 'to ' + points[3];
                }else if(points[1] === 'top'){ // diagonal gradient - from top left to opposite corner is 135deg
                    newValue += '135deg';
                }else{
                    newValue += '45deg';
                }
            }else{ // oooh, radial gradients..
                newValue += 'circle ' + parts[i].args[4].name.replace(/(\d+)$/, '$1px') + ' at ' + parts[i].args[1].name.replace(/(\d+) /, '$1px ').replace(/(\d+)$/, '$1px');
            }

            for(var j = type === 'linear' ? 3 : 5; j < parts[i].args.length; j++){
                var position, color, colorIndex;
                if(parts[i].args[j].name === 'color-stop'){
                    position = parts[i].args[j].args[0].name;
                    colorIndex = 1;
                }else if (parts[i].args[j].name === 'to') {
                    position = '100%';
                    colorIndex = 0;
                }else if (parts[i].args[j].name === 'from') {
                    position = '0%';
                    colorIndex = 0;
                };
                if (position.indexOf('%') === -1) { // original Safari syntax had 0.5 equivalent to 50%
                    position = (parseFloat(position) * 100) +'%';
                };
                color = parts[i].args[j].args[colorIndex].name;
                if (parts[i].args[j].args[colorIndex].args) { // the color is itself a function call, like rgb()
                    color += '(' + colorValue(parts[i].args[j].args[colorIndex].args) + ')';
                };
                if (parts[i].args[j].name === 'from'){
                    stops.unshift(color + ' ' + position);
                }else if(parts[i].args[j].name === 'to'){
                    toColor = color;
                }else{
                    stops.push(color + ' ' + position);
                }
            }

            // translating values to right syntax
            for(var j = 0; j < stops.length; j++){
                newValue += ', ' + stops[j];
            }
            if(toColor){
                newValue += ', ' + toColor + ' 100%';
            }
            newValue += ')' // end of gradient method
            if (i < parts.length - 1) {
                newValue += ', '
            }
        }
        if(m[3] && m[3].trim() !== ','){ // sometimes the gradient is a part of a more complex declaration (for example an image shorthand with stuff like no-repeat added), and what's after the gradient needs to be included
            newValue += ' '+m[3]
        }
    }else{ // we're dealing with more modern syntax - should be somewhat easier, at least for linear gradients.
        // Fix three things: remove -webkit-, add 'to ' before top/bottom, subtract 90 from deg-values
        // -webkit-linear-gradient( [ [ <angle> | [top | bottom] || [left | right] ],]? <color-stop>[, <color-stop>]+);
        newValue = value.replace(/-webkit-/, '');
        newValue = value.replace(/(top|bottom)/, 'to $1');
        newValue = value.replace(/\d+deg/, function (val) {
             return (parseInt(val)-90)+'deg';
         });

    }
    //GM_log(newValue)
    return {type:'declaration', property:prop, value:newValue, _fxjsdefined:true};
}

function getValueForProperty(declarations, property, prefixAgnostic){
    for(var i=0;i<declarations.length;i++){
       if(declarations[i].property == property || (prefixAgnostic && declarations[i].property.substr(8) == property)) return declarations[i].value;
    }
}
function hasDeclaration(declarations, property, value, prefixAgnostic, checkFunctionNameOnly){
    if(checkFunctionNameOnly && value.indexOf('(') > -1){
        value = value.match(/\b(\w+)\(/)[1];
        var rx = new RegExp("\\b" + value + "\\(", "i");
    }else{
        checkFunctionNameOnly = false;
    }
    for(var i=0;i<declarations.length;i++){
       if(declarations[i].property == property || (prefixAgnostic && declarations[i].property.substr(8) == property)){
            if(declarations[i].value === value || checkFunctionNameOnly && rx.test(declarations[i].value)){
                return true;
            }
       }
    }
    return false;
}

function oldGradientParser(str){
    /** This method takes a legacy -webkit-gradient() method call and parses it 
        to pull out the values, function names and their arguments.
        It returns something like [{name:'-webkit-gradient',args:[{name:'linear'}, {name:'top left'} ... ]}]
    */
    var objs = [{}], path=[], current, word='', separator_chars = [',', '(', ')'];
    current = objs[0], path[0] = objs;
    //str = str.replace(/\s*\(/g, '('); // sorry, ws in front of ( would make parsing a lot harder
    for(var i = 0; i < str.length; i++){
        if(separator_chars.indexOf(str[i]) === -1){
            word += str[i];
        }else{ // now we have a "separator" - presumably we've also got a "word" or value
            current.name = word.trim();
            //GM_log(word+' '+path.length+' '+str[i])
            word = '';
            if(str[i] === '('){ // we assume the 'word' is a function, for example -webkit-gradient() or rgb(), so we create a place to record the arguments
                if(!('args' in current)){
                   current.args = [];
                }
                current.args.push({});
                path.push(current.args);
                current = current.args[current.args.length - 1];
                path.push(current);
            }else if(str[i] === ')'){ // function is ended, no more arguments - go back to appending details to the previous branch of the tree
                current = path.pop(); // drop 'current'
                current = path.pop(); // drop 'args' reference
            }else{
                path.pop(); // remove 'current' object from path, we have no arguments to add
                var current_parent = path[path.length - 1] || objs; // last object on current path refers to array that contained the previous "current"
                current_parent.push({}); // we need a new object to hold this "word" or value
                current = current_parent[current_parent.length - 1]; // that object is now the 'current'
                path.push(current);
//GM_log(path.length)
            }
        }
    }

    return objs;
}

function colorValue(obj){
    var ar = [];
    for (var i = 0; i < obj.length; i++) {
        ar.push(obj[i].name);
    };
    return ar.join(', ');
}

function stripHTMLComments (str) {
    str = str.replace(/^\s*<!--/, '');
    str = str.replace(/-->\s*$/, '');
    return str;
}

function copyJSDefinedStyles(sheet1, sheet2){
    for(var rule, i = 0; rule = sheet1.stylesheet.rules[i]; i++){
        var clone = cloneJSDefined(rule);
        if(clone.declarations && clone.declarations.length || clone.rules && clone.rules.length){
            sheet2.stylesheet.rules = sheet2.stylesheet.rules.concat(clone)
        }
    }
    function cloneJSDefined(rule){
        var returnObj = {};
        for(var key in rule){
            if(rule[key] instanceof Array && key !== 'selectors'){
                returnObj[key] = [];
            }else{
                returnObj[key] = rule[key];
            }
        }
        if('declarations' in rule){
            for(var i = 0, decl; decl = rule.declarations[i]; i++){
                if(decl._fxjsdefined)returnObj.declarations.push(decl);
            }  
        }
        if('rules' in rule){
            for(var i = 0, subrule; subrule = rule.rules[i]; i++){
                var subclone = cloneJSDefined(subrule);
                if(subclone.rules && subclone.rules.length || subclone.declarations && subclone.declarations.length){
                    returnObj.rules.push(subclone);
                }
            }  
        }
        return returnObj;
    }
}

// unsafeWindow.CSS2Properties.prototype.__defineSetter__('background-image', function(str){this['backgroundImage']=str;})
unsafeWindow.CSS2Properties.prototype.__defineSetter__('webkitTransform', function(str){ GM_log('SETTER '+str);  this['transform']=str;})
unsafeWindow.CSS2Properties.prototype.__defineSetter__('-webkit-transform', function(str){ GM_log('SETTER2 '+str); this['transform']=str;})
