// ==UserScript==
// @name        Copy element with CSS
// @namespace   http://www.hallvord.com
// @include     http://*
// @include     https://*
// @version     1
// @grant       GM_log
// @grant       GM_setClipboard 
// ==/UserScript==

document.addEventListener('dblclick', function (e) {
	if(!e.ctrlKey)return;
	var cssdata = {}, counter = 0;
	var elm = e.target.cloneNode(true);
	// We get styles for the clicked element and every element inside it..
	elm.className = elm.className || 'elm' + counter;
	cssdata[elm.className] = getNonDefaultStyles(e.target);
	var clones = elm.getElementsByTagName('*'), originals = e.target.getElementsByTagName('*');
	for(var i = 0; i < originals.length; i++){
		clones[i].className = clones[i].className || 'elm' + counter + '_' + i;
		cssdata[clones[i].className] = getNonDefaultStyles(originals[i]);
	}
	if(e.shiftKey){
		var parent = e.target.parentElement, parentClone;
		while(parent){
			counter++;
			parentClone = parent.cloneNode(false);
			parentClone.className = parentClone.className || 'elm' + counter;
			cssdata[parentClone.className] = getNonDefaultStyles(parent);
			parentClone.appendChild(elm);
			elm = parentClone;
			parent = parent.parentElement;
		}
	}
	var text = '';
	for(var prop in cssdata){
		text += '.' + prop + '{\n' + cssdata[prop]+'\n}\n'
	}
	GM_setClipboard('<!DOCTYPE html>\n\n<style>' + text + '</style>\n\n' + elm.outerHTML);
});

function getNonDefaultStyles(elm){
	var css='';
	var defaults = getComputedStyle(document.createElement(elm.tagName));
	var live = getComputedStyle(elm);
	for(var property in live){
		if(isNaN(property) && live[property] !== defaults[property] && typeof(live[property]) != 'function'){
			css += '\t' + camel2hyphen(property) + ': ' + live[property] +';\n';
		}
	}
	return css;
}

function camel2hyphen(str){
	return str.replace(/([a-z][A-Z])/g, function (g) { 
		return g[0] + '-' + g[1].toLowerCase();
	}).replace(/^([A-Z])/, function(g){
		return '-' + g[0].toLowerCase();
	});
}

