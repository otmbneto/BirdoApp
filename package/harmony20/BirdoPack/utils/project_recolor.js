include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/* OBS: retorna mensagem de sucesso!
-------------------------------------------------------------------------------
Name:		project_recolor.js

Description:	Este script contem a funcao de recolor para o projeto.;

Usage:		usado tanto pelo script bat como na funcao de publish (flag para usar progress bar ou nao)

Author:		Leonardo Bazilio Bentolila

Created:	maio, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------

	TODO: melhorar forma de achar a palette => trocar o jeito de buscar 
		> tirar o jeito q esta pelo nome
		> trocar pela funcao da palette mais usada pelo node (BD2_GetMostUsedPaletteInNode) 

*/


function project_recolor(projectDATA, use_pg){
	
	var proj_repaint_json = projectDATA.birdoApp + "templates/color_fix/" + projectDATA.prefix + "_RepaintColors.json";
	
	if(!BD1_FileExists(proj_repaint_json)){
		Print("repaint colors json not found for this project! Repaint not necessary!");
		return false;
	}
	
	var repaint_obj = BD1_ReadJSONFile(proj_repaint_json);
	if(!repaint_obj){
		Print("Fail to read repaint json file!");
		return false;
	}
	
	//lista para check de redundancia de elementos
	repaint_obj["element_check_list"] = [];
	
	var reads = node.getNodes(["READ"]);
	var repaint_list = [];
	var i = 0;
	var recolor_counter = 0;
	
	//se precisa usar progress bar...
	if(use_pg){
		var progressDlg = new QProgressDialog();
		progressDlg.setStyleSheet(progressDlg_style);
		progressDlg.modal = true;
		progressDlg.open();
		progressDlg.setRange(0, reads.length);
	}
	
	//loop nos drawings da cena
	reads.forEach(function(element, index){
			if(use_pg){
				progressDlg.setLabelText("Chcking Nodes: [" + index + "/" + reads.length + "]");
				progressDlg.setValue(index);
			}
			
			var node_obj = get_repaint_object(repaint_obj, element);
			if(!node_obj){
				return;
			} else {
				recolor_counter++;
				Print(node_obj);
				repaint_node(node_obj);
				//change colour selectors connected
				//find cloned nodes
				var clonedNodes = reads.filter(function(x){ return node.getElementId(element) == node.getElementId(x)});
				clonedNodes.forEach(function(x){
					var cs_list = find_color_selectors(x);
					for(var i=0; i<cs_list.length; i++){
						for(var y=0; y<node_obj.color_maps.length; y++){
							var oldColor = node_obj.color_maps[y].from;
							var newColor = node_obj.color_maps[y].to;
							updateColorSelector(cs_list[i], oldColor, newColor);
						}		
					}
				});
			}
		});	
	
	
	if(use_pg){
		progressDlg.close();
	}
		
	return recolor_counter;
	
	/////EXTRA FUNCTIONS
	function get_repaint_object(repaint_obj, nodePath){//retorna objeto de repaint para o node
		var col = node.linkedColumn(nodePath,"DRAWING.ELEMENT");
		var ElementId = column.getElementIdOfDrawing(col);
		
		//checa redundancia de elementos ja na adicionados
		if(repaint_obj["element_check_list"].indexOf(ElementId) != -1){
			return false;
		}
		
		var node_obj = {};
		node_obj["node"] = nodePath;
		node_obj["nodeColumn"] = col;
		node_obj["elementId"] = ElementId;
		node_obj["color_maps"] = null;
		
		//creates ColorMap for node
		for(char_rig in repaint_obj){
			if(nodePath.indexOf(char_rig) == -1){//se for um node do char na lista
				continue;
			}
			
			var rig_pallet_name = projectDATA.birdoApp + repaint_obj[char_rig]["palette"]["name"];
			var rig_pallet_path = projectDATA.birdoApp + repaint_obj[char_rig]["palette"]["path"];
			var recInfo = repaint_obj[char_rig]["recolorInfo"];
			
			//loop no objeto com a lista de rocolors no json
			for(colorName in recInfo){
				var colorMaps = get_node_colormaps(colorName, ElementId, recInfo[colorName]["original_color"]);
				if(!colorMaps){
					continue;
				}
				node_obj["color_maps"] = !node_obj["color_maps"] ? colorMaps : node_obj["color_maps"].concat(colorMaps);
			}
			if(node_obj["color_maps"]){
				if(!updateColorsPalette(repaint_obj[char_rig], nodePath)){
					Print("FAIL to update rig colors: " + char_rig);
					continue;
				}
			}
		}
		repaint_obj["element_check_list"].push(ElementId);

		return !node_obj["color_maps"] ? false : node_obj;
	}
	
	function updateColorsPalette(charInfo, nodePath){//atualiza a palette com as cores se estiverem faltando
		var updateStatus = true;
		var palette_name = charInfo.palette.name;
		var temp_palette_path = projectDATA.birdoApp + charInfo.palette.path;
		var recolorInfo = charInfo.recolorInfo;
		var paleteList = PaletteObjectManager.getScenePaletteList();
		
		//procura pela palette por nome
		var color_palete = find_palette(palette_name, nodePath);
		if(!color_palete){
			Print("Fail to find color palette! " + palette_name);
		}
		
		//procura se ha alguma palette na cena com as cores da lista, se nao houver atualiza a palette encontrada pelo nome
		for(var color in recolorInfo){
			var color_id = recolorInfo[color]["original_color"];
			var palette = paleteList.findPaletteOfColor(color_id);
			
			if(!palette.id){
				Print("Color not found in scene: " + color);
				if(!color_palete){
					Print("ERROR! Color and palette not found!");
					updateStatus = false;
					break;
				}
				//se nao houver a cor na cena, atualiza a palette com a cor certa clonando da temp
				var temp_palette = paleteList.addPalette(temp_palette_path);
				var temp_color = temp_palette.getColorById(color_id);
				if(!temp_color.isValid){
					Print("Error finding color in temp palette: " + color);
					updateStatus = false;
					break;
				}
				color_palete.cloneColor(temp_color);
				Print("...removing temp palette: " + temp_palette.id);
				paleteList.removePaletteById(temp_palette.id);
			} else {
				Print("Color find in scene: " + color);
				Print(palette);
			}
		}
		if(!updateStatus){
			var temp_palette = paleteList.addPalette(temp_palette_path);
			Print("Nao foi encontrado uma palhete do rig na cena e foi importada uma palette com as cores originais do rig!");
			Print(temp_palette);
		}
		
		return updateStatus;
		
		//extra update colors functions
		function find_palette(palette_name, nodePath){//procura a palette pelo nome
			for(var i=0; i<paleteList.numPalettes; i++){
				var palette = paleteList.getPaletteByIndex(i);
				if(palette.getName() == palette_name){
					return palette;
				}
			}
			return BD2_GetMostUsedPaletteInNode(nodePath);
		}
	}
	
	function get_node_colormaps(colorName, ElementId, originalColorId){//retorna lista de colomaps para ao node
		var colorMaps = new Array();
		var used_colors_id = [originalColorId];//para checar redundancias e add a cor original pra pegar no check e evitar listar ela
		var elementPaletteList = PaletteObjectManager.getPaletteListByElementId(ElementId);

		for(var i=0; i<Drawing.numberOf(ElementId); i++){
			var corArray = new Array();
			var drawingId = Drawing.name(ElementId, i);
			var colorArray = DrawingTools.getDrawingUsedColors({elementId : ElementId, exposure : drawingId});
			for(var y = 0; y < colorArray.length; y++){
				var palettID = elementPaletteList.findPaletteOfColor(colorArray[y]);
				var color_palett = elementPaletteList.getPaletteById(palettID);
				var color = palettID.getColorById(colorArray[y]);
				if(color.name.toUpperCase() == colorName && used_colors_id.indexOf(color.id) == -1){
					var color_map = {"firstColorName": color.name, "secondColorName": colorName, "from": color.id, "to": originalColorId};
					colorMaps.push(color_map);
					used_colors_id.push(color.id);
				}
			}
		}
		if(colorMaps.length == 0){
			return false;
		}
		return colorMaps;
	}
	
	function repaint_node(node_recolor_obj){//roda recolor no objeto do node criado
		var nodeP = node_recolor_obj["node"];	
		var nodeCol = node_recolor_obj["nodeColumn"];
		var elementId = node_recolor_obj["elementId"];
		var colorMaps = node_recolor_obj["color_maps"];
		var draws = column.getDrawingTimings(nodeCol);
		Print("Repainting node: " + nodeP);
		draws.forEach(function(x){
			Print("	-- repainting drawing: " + x);
			var drawingKey = Drawing.Key(elementId, x);
			DrawingTools.recolorDrawing(drawingKey, colorMaps);
		});
	}
		
	function find_color_selectors(nodeP){//retorna uma lista de colour selectors conectados abaixo do node

		var cslist = [];
		var nType = "TbdColorSelector";
		findNodeTypeDonw(nodeP, 0);

		return cslist;

		function findNodeTypeDonw(rootNode, p){
			if(rootNode == ""){
				return false;			
			}
			var prev_node = null;
			for(var i=0; i<node.numberOfOutputLinks(rootNode, p); i++){
				var prev_info = node.dstNodeInfo(rootNode, p, i);
				if (node.type(prev_info.node) == nType){
					cslist.push(prev_info.node);
				} else if (node.type(prev_info.node) == "GROUP"){ 
					var portIn = prev_info.node + "/Multi-Port-In"; 
					prev_node = findNodeTypeDonw(portIn, prev_info.port);
				} else if (node.type(prev_info.node) == "MULTIPORT_OUT"){
					var parentN = node.parentNode(prev_info.node); 
					prev_node = findNodeTypeDonw(parentN, prev_info.port);
				} 
				if(prev_node){
					return prev_node;
				} else {
					prev_node = findNodeTypeDonw(prev_info.node, 0);			
				}
			}
			return prev_node;
		}
	}
		
	function updateColorSelector(csNode, rmColorId, addColorId){//modifica a lista de cores do colour selector (remove e add as cores dadas)
		var wAttr = node.getAttr(csNode, 1, "selectedcolors");
		var colorList = JSON.parse(wAttr.textValue());
		var updatedList = colorList.filter(function(element){
			return element.colorId != rmColorId;
		});
		if(colorList.length == updatedList.length){
			Print("Nao e necessario mudar o Colour-Selector : " + csNode);
			return;
		}
		var colorObj = getColorData(addColorId);
		if(!colorObj){
			Print("ERROR geting orignal color to update cselector: " + addColorId);
			return;
		}
		updatedList.push(colorObj);
		wAttr.setValue(JSON.stringify(updatedList));
		Print("Updated Colour-Selector: " + csNode);

		function getColorData(colorID){
			var paletteList = PaletteObjectManager.getScenePaletteList();
			var pal = paletteList.findPaletteOfColor(colorID);
			var cData = pal.getColorById(colorID);
			if(!cData.isValid){
				return false;
			}
			return { 
				"a" : cData.colorData.a,
				"r" : cData.colorData.r,
				"g" : cData.colorData.g,
				"b" : cData.colorData.b,
				"colorId" : cData.id,
				"name" : cData.name
			};	
		}
	}
}

exports.project_recolor = project_recolor;