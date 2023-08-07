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
*/

function addWriteSombra_LEB(){

	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return;
	}
	//add matte lines
	add_write_sombra(projectDATA);
}
exports.addWriteSombra_LEB = addWriteSombra_LEB;


function add_write_sombra(proj_data){//add matte line e um write node para cada write node existente
	var writes = node.getNodes(["WRITE"]).filter(function(n){ return node.getEnable(n)});
	writes.forEach(function(n){ 
		add_matte_line(proj_data, n)
	});
}

function add_matte_line(proj_data, write_node){
	
	//creates matte class
	var matte_object = new MattePalletData();
	matte_object.create_new_pallet();
	
	//connected node
	var up_node = node.srcNode(write_node, 0);
	
	//add color override
	var co = addColourOverride(up_node, matte_object.matte_pallete);
	
	//add line matte write
	var render_path = "frames/" + scene.currentScene() + (node.getName(write_node).replace(/Write_(FINAL?)/, "") +"_mttline");
	var write_mttline = BD2_AddNodeUnder(co, (node.getName(write_node) + "_MATTEline"), "WRITE", true);
	BD2_changeWriteNodeAtt(proj_data, write_mttline, render_path, "COMP");

	Print("Added matte line to write node : " + write_node);	
}

function addColourOverride(origin_node, palette){//

	var palettePath = palette.getPath() + "/" + palette.getName() + ".plt";
	
	var co = BD2_AddNodeUnder(origin_node, "CO_MATTEline", "COLOR_OVERRIDE_TVG", true);
	if(!co){
		Print("Fail to add color override node!");
		return false;
	}
	var coObj = node.getColorOverride(co);
	coObj.clearPalettes();
	coObj.addPalette(palettePath);
	return co;
}

function MattePalletData(){//cria objeto com infos das matte pallets da cena e com metodos para pegar as palettes
	this.folder = scene.currentProjectPath() + "/palette-library/";
	this.prefix = "_mtt";
	var regex = /(_?mtt|_?matte)/;
	var palets_list = BD1_ListFiles(this.folder, "*.plt").filter(function(x){ 
		return regex.test(x);
	});
	this.prefix_regex = regex;
	this.mattes_list = palets_list.map(function(item){ return item.split(".")[0]});
	this.mattes_list.sort();
	this.has_mattes = this.mattes_list.length > 0;
	this.mattes_list.unshift("");//cria item vazio pra ser o index 0 no combo
	this.pl = PaletteObjectManager.getScenePaletteList();
	
	this.ignore_name_regex = /(LINHA|Linha|LINE|Line)/;
	
	this.matte_pallete = null;
	
	//callback methods
	this.get_matte_palette = function(index){
		if(this.mattes_list[index] == "" || index == 0){
			MessageLog.trace("Pallet path nao existe para o index selecionado!");
			return false;
		}
		var pal_path = this.folder + this.mattes_list[index];
		return this.pl.addPalette(pal_path);
	}
	
	this.addPalleteColorsToMatteOverride = function(){//adiciona as cores da pelette dada para o MatteOverridePalette
		
		var errorCounter = 0;
		var counter = 0;
		var counterIgnored = 0;
		for(var i=0; i<this.pl.numPalettes; i++){
			var palette = this.pl.getPaletteByIndex(i);
			MessageLog.trace("--cloning palette: " + palette.getName());
			for(var y=0; y<palette.nColors; y++){
				var cor = palette.getColorByIndex(y);
				if(!cor.isValid || !cor.name || cor.colorType == undefined){
					Print("Color not valid: " + cor.name);
					errorCounter++;
					continue;		
				}
				
				if(isColorInMattePallete(this.matte_pallete, cor) || is_black_color(cor)){
					MessageLog.trace("Ignoring color: " + cor.name);
					counterIgnored++;
					continue;
				}
				var cloneColor = this.matte_pallete.cloneColor(cor);
				if(!cloneColor){
					Print("Error cloning color: " + cor.name);
					errorCounter++;
					continue;
				}
				cloneColor.setColorData(convertColor(new QColor(255,255,255,255)));
				counter++;
			}
		}
		MessageLog.trace("add palettes: " + this.pl.numPalettes + "\n-erros: " + errorCounter + "\n-cloned: " + counter + "\n-ignored: " + counterIgnored);
	}

	this.create_new_pallet = function(){//cria a proxima palette
		var new_plt_name = "__mtteLineReder";
		if(!new_plt_name){
			Print("Canceled..");
			return false;
		}
		var new_mattePal_path = this.folder + new_plt_name;
		var newMattePalette = this.pl.createPalette(new_mattePal_path);
		//clean defalt color created with palette
		var defaltColor = newMattePalette.getColorByIndex(0);
		newMattePalette.removeColor(defaltColor.id);
		MessageLog.trace("new matte pallete created: " + newMattePalette.getName());
		scene.saveAll();
		this.mattes_list.push(newMattePalette.getName());
		//update has_mattes flag
		this.has_mattes = true;
		//define matte pallet
		this.matte_pallete = newMattePalette;
		//add cloned colours to matte pallet
		this.addPalleteColorsToMatteOverride();
	}

	//extras functions
	function isColorInMattePallete(mattePalette, color){//checa se a cor ja esta na mattePalette
		return mattePalette.getColorById(color.id).isValid;
	}
	function convertColor(colorObj){//retorna objeto de cor formatado como a,r,g,b num objeto
		return {"a": colorObj.alpha(), "r": colorObj.red(), "g": colorObj.green(), "b": colorObj.blue()};	
	}
	function is_black_color(color){
		var corData = color.colorData;
		return corData.r == 0 && corData.g == 0 && corData.b == 0 && corData.a == 255;
	}
}