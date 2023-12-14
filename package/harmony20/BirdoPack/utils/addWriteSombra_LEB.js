include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		addWriteSombra_LEB.js

Description:	este script é um util para modificar a cena antes do render do projeto LEB para adicionar write para sombras;

Usage:		usar como util no modifyScenePreRender do LEB

Author:		Leonardo Bazilio Bentolila

Created:	julho, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
 - Procura os nodes de sombra dentro dos rigs na cena e testa se estao sendo usados
   - se estiverem sendo usados, add esquema de exportar sombras separas!
*/


//regex node (colors) shadow name
var sh_regex = /^(SHADOW|SOMBRA)$/;

var sh_node_regex = /(SHADOW|SOMBRA)/;

var asset_regex = /^[A-Z]{2}\d{3}_\w+(_v\d+)?(_\d+)?$/;


function addWriteSombra_LEB(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	
	//shadow nodes in scene
	var sh_nodes = findShadowNodes(projectDATA);
	if(sh_nodes.length == 0){
		Print("No shadow nodes in the scene! No need to separete!");
		return;
	}
	
	//add matte lines
	add_write_sombra(projectDATA, sh_nodes);
}
exports.addWriteSombra_LEB = addWriteSombra_LEB;


function add_write_sombra(proj_data, sombra_nodes){
	
	//find list of shadow colors
	var shadow_color_list = getNodesUsedColors(sombra_nodes);
	var plist = PaletteObjectManager.getScenePaletteList();
	
	//cloned pallet
	var clone_pallet_path = scene.currentProjectPath() + "/palette-library/_cloneSHADOW";
	var clone_pallet = plist.createPalette(clone_pallet_path);
	//clean defalt color created with palette
	var defaltColor = clone_pallet.getColorByIndex(0);
	clone_pallet.removeColor(defaltColor.id);
	Print("new matte pallete created: " + clone_pallet.getName());
	
	Print(shadow_color_list.length + " cores de shadow encontradas...");
		
	shadow_color_list.forEach(function(item){
		cloneToPallet(item);
	});
	
	//att to pu in cs color list
	var colors_formated = shadow_color_list.map(function(item){ return get_color_cs_object(item.id)});
	
	var finalComp = "Top/SETUP/FINAL";
	if(node.getName(finalComp) == ""){
		Print("ERROR! Cant find FINAL comp in SETUP Group!");
		return false;
	}
	
	//add remove color shadow to writeFinal
	addColourOverride(clone_pallet);
	
	//add color override
	var cs = addCSNode(finalComp, colors_formated);
	
	//add write
	var write_node = BD2_AddNodeUnder(cs, "Write_SH", "WRITE", true);
	var render_path = "frames/" + scene.currentScene() + (node.getName(write_node).replace(/Write/, ""));
	BD2_changeWriteNodeAtt(proj_data, write_node, render_path, "COMP");

	Print("Added shadow write node : " + write_node);	
	
	
	//EXTRA FUNCIONTS
	function cloneToPallet(color){
		var clonedColor = clone_pallet.cloneColor(color);
		if(!clonedColor){
			Print("Error cloning color: " + color.name);
			return false;
		}
		clonedColor.setColorData(convertColor(new QColor(255,255,255,0)));
		return true;
	}
	
	function get_color_cs_object(id){//find color and convert object to formated string for color selector attr
		var pal = plist.findPaletteOfColor(id);
		var colorObj = pal.getColorById(id);
		var obj = colorObj["colorData"];
		obj["colorId"] = colorObj.id;
		obj["name"] = colorObj.name;
		return obj;
	}
	function convertColor(colorObj){//retorna objeto de cor formatado como a,r,g,b num objeto
		return {"a": colorObj.alpha(), "r": colorObj.red(), "g": colorObj.green(), "b": colorObj.blue()};	
	}
}

function addCSNode(origin_node, color_list){//add cs node to parent node
	var cs = BD2_AddNodeUnder(origin_node, "CS_Shadow", "TbdColorSelector", true);
	if(!cs){
		Print("Fail to add color selector node!");
		return false;
	}
	var att_colors = node.getAttr(cs, 1, "selectedColors");
	att_colors.setValue(JSON.stringify(color_list));
	return cs;
}

function addColourOverride(clone_pallet){//add color override para eliminar as cores da sombra no render final
	var writeFinal = "Top/SETUP/Write_FINAL";
	var palettePath = clone_pallet.getPath() + "/" + clone_pallet.getName() + ".plt";
	var co = BD2_AddNodeUp(writeFinal, "_removeSHADOW", "COLOR_OVERRIDE_TVG");
	if(!co){
		Print("Fail to add color override node!");
		return false;
	}
	var coObj = node.getColorOverride(co);
	coObj.clearPalettes();
	coObj.addPalette(palettePath);
	return co;
}


function findShadowNodes(projData){//lista nodes de sombra da cena
	var sh_nodes = []
	var reads = node.getNodes(["READ"]);
	reads.forEach(function(item){
		var underNode = node.dstNode(item, 0, 0);
		if(sh_node_regex.test(node.getName(item).toUpperCase()) && node.type(underNode) == "BLEND_MODE_MODULE"){
			if(testIfNodeIsUsed(projData, item)){
				sh_nodes.push(item);
			}
			node.setEnable(underNode, false);
		}
	});
	return sh_nodes;
}

function getNodesUsedColors(nodes){
	//return list of used colors in given nodes
	var used_colors = new Array();
	var idCheckList = new Array();
	nodes.forEach(function(item){
		var elementId = node.getElementId(item);
		var elementPaletteList = PaletteObjectManager.getPaletteListByElementId(elementId);
		for(var j=0; j<Drawing.numberOf(elementId); j++){
			var drawingId = Drawing.name(elementId, j);
			var colorArray = DrawingTools.getDrawingUsedColors({elementId: elementId, exposure: drawingId});
			colorArray.forEach(function(colorID){
				var palettID = elementPaletteList.findPaletteOfColor(colorID);
				var cor = palettID.getColorById(colorID);
				if(idCheckList.indexOf(cor.id) == -1){
					used_colors.push(cor);
					idCheckList.push(cor.id);
				}	
			});
		}
	});	
	return used_colors;
}

function testIfNodeIsUsed(pdata, nodeP){//testa se o node esta sendo usado na cena
	
	if(!node.getEnable(nodeP)){
		return false;
	}
	
	var col = node.linkedColumn(nodeP, "DRAWING.ELEMENT");
	for(var i=0; i<frame.numberOf(); i++){
		var exp = column.getEntry(col, 1, i);
		if(exp != "" && exp != "Zzero"){
			if(BD2_isInCameraFrame(pdata, i, nodeP)){
				return true;
			}
		}
	}
	return false;
}