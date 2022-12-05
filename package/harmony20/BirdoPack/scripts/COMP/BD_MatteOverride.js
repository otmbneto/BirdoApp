/*
-------------------------------------------------------------------------------
Name:		BD_MatteOverride.js

Description:	Este script adiciona um Colour-Override com o modo pallet-override para o matte branco (apenas linhas pretas) pra aplicar no personagem 

Usage:		Selecione a pallet q deseja criar, e aperte.

Author:		Leonardo Bazilio Bentolila

Created:	julho, 2022 (update novembro 2022).
            
Copyright:   leobazao_@Birdo
-------------------------------------------------------------------------------
	TODO: 
		[ ] - fazer tratamento dos presets no UpdateColors
		[ ] - criar o metodo de add colourOverride NAO renderizando as cores do preset (add checkbox?)
		[ ] - melhorar forma como add os nodes (procurar link pra add... se nao tiver um dst disponivel, nao conectar o CO e deixar ele do lado 
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

var version = "v.1.2";

function BD_MatteOverride(){
	
	var projData = BD2_ProjectInfo();
	
	if(!projData){
		MessageBox.warning("Erro ao logar infos do BirdoApp! Avise a DT!",0,0);
		return;
	}
	
	var paletteList = PaletteObjectManager.getScenePaletteList();

	var mattePaletteData = new MattePalletData(paletteList);
	
	var uiPath = projData.paths.birdoPackage + "ui/BD_MatteOverride.ui";
	
	var presetsData = getPresets(projData, paletteList);
	
	var d = new CreateInterface(uiPath, mattePaletteData, presetsData);
	d.ui.show();
	
	///EXTRA FUNCS
	function MattePalletData(paletteList){//cria objeto com infos das matte pallets da cena e com metodos para pegar as palettes
		this.folder = scene.currentProjectPath() + "/palette-library/";
		var palets_list = BD1_ListFiles(this.folder, "*.plt").filter(function(x){ 
			return x.indexOf("_matte") != -1
		});
		this.mattes_list = palets_list.map(function(item){ return item.split(".")[0]});
		this.mattes_list.sort();
		this.has_mattes = this.mattes_list.length > 0;
		this.mattes_list.unshift("");//cria item vazio pra ser o index 0 no combo
		this.pl = paletteList;

		//callback methods
		this.get_matte_palette = function(index){
			if(this.mattes_list[index] == "" || index == 0){
				MessageLog.trace("Pallet path nao existe para o index selecionado!");
				return false;
			}
			var pal_path = this.folder + this.mattes_list[index];
			return this.pl.addPalette(pal_path);
		}

		this.get_next_pallet_name = function(){
			var last_item = this.mattes_list[this.mattes_list.length -1];
			var regex = /\d{2}/;//numero no nome '01'
			if(!last_item){
				return "_matte01";
			}
			var last_num = regex.test(last_item) ? regex.exec(last_item)[0] : 0;
			return ("_matte" + ("00" + (parseFloat(last_num) + 1)).slice(-2));
		}

		this.create_next_pallet = function(){//cria a proxima palette
			var next_mattePal_path = this.folder + this.get_next_pallet_name();
			var newMattePalette = this.pl.createPalette(next_mattePal_path);
			//clean defalt color created with palette
			var defaltColor = newMattePalette.getColorByIndex(0);
			newMattePalette.removeColor(defaltColor.id);
			MessageBox.information("Palette " + newMattePalette.getName() + " foi criada! Agora as cores clonadas serao adicionadas nessa paleta e usada como Palette-Override para os nodes criados!\nUse a interface para adicinoar ou remover cores desta matte!");
			MessageLog.trace("new matte pallete created: " + newMattePalette.getName());
			scene.saveAll();
			this.mattes_list.push(newMattePalette.getName());
			//update has_mattes flag
			this.has_mattes = true;
			return newMattePalette;
		}
	}

	function getPresets(projData, paletteList){//retorna objeto com infos sobre os presets validos achados
		var presets_data = {
			"is_valid": false,
			"presets": {},
			"templates": {}	 
		};
		var presets_folder = projData.getTBLIB("server") + "mattes_presets/";
		if(!BD1_DirExist(presets_folder)){
			Print("No presets for this project!");
			return presets_data;
		}
		var preset_json_list = BD1_ListFiles(presets_folder, "*.json");
		if(preset_json_list.length == 0){
			Print("No presets for this project!");
			return presets_data;
		}
		
		for(var i=0; i<preset_json_list.length; i++){
			var jsonfile = presets_folder + preset_json_list[i];
			var data = BD1_ReadJSONFile(jsonfile);
			if(!data){
				continue;
			}
			var presetName = preset_json_list[i].split(".")[0];
			var obj = {};
			Print("Preset analizing: " + presetName);
			for(colorId in data){
				if(paletteList.findPaletteOfColor(colorId)){	
					obj[colorId] = data[colorId];
					Print(" -- Valid preset colour found: " + data[colorId]);
					presets_data["is_valid"] = true;
				}
			}
			if(Object.keys(obj).length > 0){
				Print("Preset added: " + presetName);
				presets_data["presets"][presetName] = obj;
			}
		}
		var tpls_folders = presets_folder + "templates/";
		var co_tpls = BD1_ListFolders(tpls_folders).filter(function(x){return x.indexOf(".tpl") != -1});
		co_tpls.forEach(function(item, index){
			presets_data["templates"][item.replace(".tpl", "")] = tpls_folders + item;
		});
		return presets_data;
	}
}

function CreateInterface(uiPath, matteData, presetsData){
	
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	
	//fix windows size
	this.ui.setGeometry(this.ui.x, this.ui.y, 390, 575);
	
	//self variables
	this.matteColour = new QColor(255,255,255,255);//inicialmente branco
	this.ingoneColour = new QColor(0,0,0,255);//inicialmente preto
	this.addedColors = 0;
	this.currPalette = null;
	this.sourcePalette = null;
	this.matteData = matteData;
	this.presetsData = presetsData;

	//updates version
	this.ui.labelVersion.text = version;
	//update palettes combo
	this.ui.comboMatteList.addItems(this.matteData.mattes_list);
	//enable combo palettes
	this.ui.comboMatteList.enabled = this.matteData.has_mattes;
	//update presets widgets
	this.ui.groupAdvenced.radioCorPreset.enabled = this.presetsData.is_valid;
	this.ui.groupAdvenced.comboCorPreset.enabled = this.presetsData.is_valid;
	this.ui.groupAdvenced.comboCorPreset.addItems(Object.keys(this.presetsData.presets));
	//update templates widgets
	var tpl_list = Object.keys(this.presetsData.templates);
	this.ui.groupTeplate.enabled = tpl_list.length > 0;
	this.ui.groupTeplate.comboTemplates.addItems(tpl_list);
	
	//CALL BACKS
	this.updateColorsNamesCombo = function(){//atualiza a lista de cores no combo nome
		this.ui.groupAdvenced.comboCorName.clear();
		var curr_color_list = getColorsList(this.currPalette);
		curr_color_list.unshift("");
		this.ui.groupAdvenced.comboCorName.addItems(curr_color_list);
	}
	
	this.selectMattePalette = function(){//callback do combo de palettes quando muda
		this.currPalette = this.matteData.get_matte_palette(this.ui.comboMatteList.currentIndex);
		
		this.ui.groupPalettes.enabled = Boolean(this.currPalette);
		this.ui.groupAdvenced.enabled = Boolean(this.currPalette);
		this.ui.addMatteNodeButton.enabled = Boolean(this.currPalette);
		
		if(!this.currPalette){
			Print("No palette selected!");
			return;
		}
		
		//update clear button state
		var plt_is_valid = this.currPalette.nColors > 0;
		this.ui.groupPalettes.pushRemoveColors.enabled = plt_is_valid;
		this.ui.groupAdvenced.enabled = plt_is_valid;
		
		this.matteColour = plt_is_valid ? createQColor(this.currPalette.getColorByIndex(0)) : new QColor(255,255,255,255);//inicialmente branco se nao houver cores escolhidas
		
		//update matte color button
		this.changeButtonColor(this.ui.groupAdvenced.pushMatteColor, this.matteColour);
		
		//update combo names
		this.updateColorsNamesCombo();
		//update radios in advanced groupAdvenced
		this.changeRadio();
		//update palette buttons
		this.updatePaletteButtons();		
	}
	
	this.createNewMattePallette = function(){//callback do pushButton de criar nova 
		scene.beginUndoRedoAccum("MATTEOVERRIDE - create new Matte");
		//cria palette nova
		this.currPalette = this.matteData.create_next_pallet();
		
		if(!this.currPalette){
			MessageBox.warning("Erro ao criar nova palette!", 0, 0);
			return;
		}
		
		//atualiza combo de matte paletes
		this.ui.comboMatteList.addItem(this.currPalette.getName());
		this.ui.comboMatteList.setCurrentIndex(this.ui.comboMatteList.count -1);
		this.ui.comboMatteList.enabled = this.matteData.has_mattes;

		scene.endUndoRedoAccum();
	}
	
	this.changeButtonColor = function(buttonWidget, newColor){//atualiza a cor do botao 
		var rgbStr = "rgb(" + newColor.red() + "," + newColor.green() + "," + newColor.blue() + ")";
		var currStyle = buttonWidget.styleSheet;
		buttonWidget.styleSheet = currStyle.replace(/rgb\(\d+,\d+,\d+\)/, rgbStr);	
	}
	
	this.updateProgressBar = function(){
		var val = this.ui.progressBar.value;
		this.ui.progressBar.value = val + 1;	
	}
	
	this.updatePaletteButtons = function(){//habilita os botoes de palette
		this.ui.groupPalettes.pushAddColors.enabled = this.ui.groupPalettes.labelPalette.text != "" || !this.ui.groupPalettes.radioChoosePal.checked;
		this.ui.groupPalettes.pushSelPal.enabled = this.ui.groupPalettes.radioChoosePal.checked;
		this.ui.groupPalettes.labelPalette.enabled = this.ui.groupPalettes.radioChoosePal.checked;
		this.ui.groupPalettes.pushRemoveColors.enabled = this.currPalette.nColors > 0;
	}
	
	this.changeRadio = function(){
		this.ui.groupAdvenced.comboCorName.enabled = this.ui.groupAdvenced.radioCorName.checked;
		this.ui.groupAdvenced.pushIgnoreColor.enabled = this.ui.groupAdvenced.radioCorVal.checked;
		this.ui.groupAdvenced.comboCorPreset.enabled = this.ui.groupAdvenced.radioCorPreset.checked;
	}	
	
	this.onCheckPalletOptions = function(){
		this.updatePaletteButtons();
		Print("Changed add colors mode...");
	}
	
	this.onSelectPalette = function(){//callback do botao de escolher palette para add as cores na matte
		var sel_pallet = this.matteData.pl.getPaletteById(PaletteManager.getCurrentPaletteId());
		var validPalette = true;
		if(sel_pallet.getName().indexOf("-matte") != -1 || !sel_pallet.isValid()){
			MessageBox.warning("Palette selecionado e INVALIDA! Selecione uma palette valida na janela de cores!",0,0);
			this.ui.groupPalettes.labelPalette.text = "";
			this.sourcePalette = null;
			Print("Invalid palette selection!");
			validPalette = false;
			this.ui.progressBar.format = "Selecione uma palette valida!";
		} else {
			this.sourcePalette = sel_pallet;
			this.ui.groupPalettes.labelPalette.text = this.sourcePalette.getName();
			Print("Palette selected: " + this.sourcePalette.getName());
			this.ui.progressBar.format = "Palette selected: " + this.sourcePalette.getName();
		}
		this.updatePaletteButtons();
	}
	
	this.onAddColors = function(){
		scene.beginUndoRedoAccum("MATTEOVERRIDE - add colors");
		//reset counters;
		this.addedColors = 0;
		var paletteCounter = 0;
		if(this.ui.groupPalettes.radioChoosePal.checked){
			Print("Mode Palette is Choose Single Palette!");
			this.addPalleteColorsToMatteOverride(this.sourcePalette);
			paletteCounter++;
		} else {
			Print("Mode Palette is ALL colors Palette!");
			for(var i=0; i<this.matteData.pl.numPalettes; i++){
				var paleta = this.matteData.pl.getPaletteByIndex(i);
				if(paleta.getName().indexOf("_matte") != -1 || !paleta.isValid() || !paleta.isLoaded()){
					Print("ignoring palette: " + paleta.getName());
					continue;
				}
				this.addPalleteColorsToMatteOverride(paleta);
				paletteCounter++;
			}
		}
		scene.endUndoRedoAccum();
		
		//enable advanced options
		this.ui.groupAdvenced.enabled = true;
		
		this.onUpdateColors();
		this.ui.progressBar.clear();
		this.ui.progressBar.format = "Palettes: " + paletteCounter + " - colors: " + this.addedColors;
		Print(paletteCounter + " palettes added and " + this.addedColors + " colors added");
	}	
	
	this.onClearColors = function(){
		scene.beginUndoRedoAccum("MATTEOVERRIDE - clear colors");
		var delete_counter = 0;
		this.ui.progressBar.maximum = this.currPalette.nColors - 1;

		for(var i=this.currPalette.nColors-1; i>=0; i--){
			this.updateProgressBar();
			var cor = this.currPalette.getColorByIndex(i);
			this.ui.progressBar.format = "deleting... " + cor.name;
			Print("...deleting color: " + cor.name);
			this.currPalette.removeColor(cor.id);
			delete_counter++;
		}
		this.updatePaletteButtons();
		
		Print("cores deletadas do mattePalette: " + delete_counter);
		this.ui.progressBar.format = "MattePalette foi limpa! removidos: " + delete_counter;
		this.ui.progressBar.value = 0;
		scene.endUndoRedoAccum();
	}
	
	this.addPalleteColorsToMatteOverride = function(palette){//adiciona as cores da pelette dada para o MatteOverridePalette
		Print("--cloning palette: " + palette.getName());
		var errorCounter = 0;
		var counter = 0;
		var counterIgnored = 0;
		
		this.ui.progressBar.maximum = palette.nColors - 1;
		for(var i=0; i<palette.nColors; i++){
			this.updateProgressBar();
			var cor = palette.getColorByIndex(i);
			this.ui.progressBar.format = "analizing... " + cor.name;
			Print("...analizing color: " + cor.name);
			
			if(!cor.isValid || !cor.name || cor.colorType == undefined){
				Print("Color not valid: " + cor.name);
				errorCounter++;
				continue;		
			}
			
			if(isColorInMattePallete(this.currPalette, cor)){
				Print("Color is already in the mattePalette: " + cor.name);
				continue;
			}
			if(this.isColorIgnored(cor)){
				Print("Ignoring color: " + cor.name);
				counterIgnored++;
				continue;
			}
			var cloneColor = this.currPalette.cloneColor(cor);
			if(!cloneColor){
				Print("Error cloning color: " + cor.name);
				errorCounter++;
			} else {
				counter++;
			}
		}	
		Print("add palette: " + palette.getName() + "\n-erros: " + errorCounter + "\n-cloned: " + counter + "\n-ignored: " + counterIgnored);
		this.ui.progressBar.format = "palette added: " + palette.getName();
		this.ui.progressBar.value = 0;
		//update global counter 
		this.addedColors += counter;
	}
	
	this.isColorIgnored = function(color){//retorna TRUE se a cor deve ser ignorada
		if(!this.ui.groupAdvenced.checkIgnore.checked){
			Print("Not using ignore option...");
			return false;
		}
		var isIgnore = false;
		if(this.ui.groupAdvenced.radioCorName.checked){
			isIgnore = this.ui.groupAdvenced.comboCorName.currentText == color.name;
		} else if(this.ui.groupAdvenced.radioCorPreset.checked){
			isIgnore = color.id in this.presetsData.presets[this.ui.groupAdvenced.comboCorPreset.currentText];
		} else if(this.ui.groupAdvenced.radioCorVal.checked){
			isIgnore = compareColors(color, this.ingoneColour);
		}
		return isIgnore;
	}
	
	this.onSelectMatteColor = function(){
		var selColor = pickColor(this.matteColour);
		if(!selColor){
			Print("Escolha da cor cancelada..");
			return;
		}
		this.matteColour = selColor;
		this.changeButtonColor(this.ui.groupAdvenced.pushMatteColor, selColor);
		Print("Matte color selected: ");
		Print(convertColor(this.matteColour));
	}
	
	this.onSelectIgnoreColor = function(){
		var selColor = pickColor(this.ingoneColour);
		if(!selColor){
			Print("Escolha da cor cancelada..");
			return;
		}
		this.ingoneColour = selColor;		
		this.changeButtonColor(this.ui.groupAdvenced.pushIgnoreColor, this.ingoneColour);
		Print("Ignore color selected: ");
		Print(convertColor(this.ingoneColour));
	}
	
	this.onCheckIgnore = function(){
		var showIgnore = this.ui.groupAdvenced.checkIgnore.checked;
		this.ui.groupAdvenced.radioCorName.enabled = showIgnore;
		this.ui.groupAdvenced.radioCorVal.enabled = showIgnore;

		this.ui.groupAdvenced.comboCorName.enabled = showIgnore && this.ui.groupAdvenced.radioCorName.checked;
		this.ui.groupAdvenced.pushIgnoreColor.enabled = showIgnore && this.ui.groupAdvenced.radioCorVal.checked;
		Print("Use ignore colors: " + showIgnore);
		//update combo names
		this.updateColorsNamesCombo();
	}
	
	this.onUpdateColors = function(){//callback do botao de atualizar as cores
		//check if matteOverride palette has no color yet
		if(this.currPalette.nColors == 0){
			this.ui.progressBar.format = "No color in the MatteOverride Palette!";
			Print("Nenhuma cor para modificar!");
			return;
		}
		
		scene.beginUndoRedoAccum("MATTEOVERRIDE - update colors");
		var counter_repaint = 0;
		var counter_removed = 0;
		this.ui.progressBar.maximum = this.currPalette.nColors - 1;

		for(var i=this.currPalette.nColors-1; i>=0; i--){
			this.updateProgressBar();
			var cor = this.currPalette.getColorByIndex(i);
			var originalColor = this.matteData.pl.findPaletteOfColor(cor.id).getColorById(cor.id);//cor na palete original
			this.ui.progressBar.format = "analizing... " + cor.name;
			Print("...updating color: " + cor.name);
			
			if(this.isColorIgnored(originalColor)){
				Print("color to ignore: " + originalColor.name);
				this.currPalette.removeColor(cor.id);
				counter_removed++;
				continue;
			}
			//recolor
			cor.setColorData(convertColor(this.matteColour));
			counter_repaint++;
		}	
		Print("update MattePalette:\n -removed: " + counter_removed + "\n -repaint: " + counter_repaint);
		this.ui.progressBar.format = "UpdateColors: - removed: " + counter_removed + " -repaint: " + counter_repaint;
		this.ui.progressBar.value = 0;
		scene.endUndoRedoAccum();
		//update combo names
		this.updateColorsNamesCombo();
	}
	
	this.onAddTpl = function(){
		var selNode = selection.selectedNode(0);
		if(!selNode){
			MessageBox.warning("Selecione um node para aplicar o matte!",0,0);
			return;
		}
		
		scene.beginUndoRedoAccum("MATTEOVERRIDE - add tpl");

		var selected_tpl = this.presetsData.templates[this.ui.groupTeplate.comboTemplates.currentText];
		var importedNode = importTPL(selected_tpl)[0];
		connectNodeUnder(selNode, importedNode);
		scene.endUndoRedoAccum();			
	}
	
	this.onAddNode = function(){
		var selNode = selection.selectedNode(0);
		if(!selNode){
			MessageBox.warning("Selecione um node para aplicar o matte!",0,0);
			return;
		}
		
		scene.beginUndoRedoAccum("MATTEOVERRIDE - add node");
		
		var co = addColourOverride(selNode, this.currPalette);
		if(co){
			this.ui.progressBar.format = co + " created!";
		} else {
			this.ui.progressBar.format = "fail to create MatteOverride...";
		}
		scene.endUndoRedoAccum();
	}
		
	this.onClose = function(){
		Print("Ui closed..");
		this.ui.close();
	}
	
	//connections
	this.ui.comboMatteList["currentIndexChanged(QString)"].connect(this, this.selectMattePalette);
	this.ui.pushCreateMatte.clicked.connect(this, this.createNewMattePallette);
	
	this.ui.groupPalettes.radioAllColors.toggled.connect(this, this.onCheckPalletOptions);
	this.ui.groupPalettes.radioChoosePal.toggled.connect(this, this.onCheckPalletOptions);

	this.ui.groupAdvenced.radioCorName.toggled.connect(this, this.changeRadio);
	this.ui.groupAdvenced.radioCorVal.toggled.connect(this, this.changeRadio);
	
	this.ui.groupAdvenced.checkIgnore.toggled.connect(this, this.onCheckIgnore);

	this.ui.groupPalettes.pushSelPal.clicked.connect(this, this.onSelectPalette);
	this.ui.groupPalettes.pushAddColors.clicked.connect(this, this.onAddColors);
	this.ui.groupPalettes.pushRemoveColors.clicked.connect(this, this.onClearColors);

	this.ui.groupAdvenced.pushMatteColor.clicked.connect(this, this.onSelectMatteColor);
	this.ui.groupAdvenced.pushIgnoreColor.clicked.connect(this, this.onSelectIgnoreColor);
	this.ui.groupAdvenced.pushUpdateColors.clicked.connect(this, this.onUpdateColors);

	this.ui.groupTeplate.pushAddSpecialTpl.clicked.connect(this, this.onAddTpl);
	this.ui.addMatteNodeButton.clicked.connect(this, this.onAddNode);
	this.ui.closeButton.clicked.connect(this, this.onClose);
		
	////Funcoes extras da interface/////
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
	
	function getColorsList(palete){//retorna lista com os nomes das cores da palette
		var colors = [];
		for(var i=0; i<palete.nColors; i++){
			var cor = palete.getColorByIndex(i);
			if(colors.indexOf(cor.name) == -1){
				colors.push(cor.name);
			}
		}
		colors.sort();
		return colors;
	}
	
	function pickColor(currColor){//dialog para escolher cor
		var d = new QColorDialog;
		Print("TESSSTE");
		Print(d.setOption(QColorDialog.ShowAlphaChannel, true));
		d.currentColor = currColor
		if(!d.exec()){
			return false;
		}
		var color = d.selectedColor();
		return color;
	}
	
	function compareColors(palColor, qcolor){//compara uma cor QColor com uma palette color
		return palColor.colorData.a == qcolor.alpha() && palColor.colorData.r == qcolor.red() && palColor.colorData.g == qcolor.green() && palColor.colorData.b == qcolor.blue();
	}
	
	function isColorInMattePallete(mattePalette, color){//checa se a cor ja esta na mattePalette
		return mattePalette.getColorById(color.id).isValid;
	}
	
	function convertColor(colorObj){//retorna objeto de cor formatado como a,r,g,b num objeto
		return {"a": colorObj.alpha(), "r": colorObj.red(), "g": colorObj.green(), "b": colorObj.blue()};	
	}
	
	function createQColor(palColor){//cria cor QColor baseado numa cor de uma palette
		return new QColor(palColor.colorData.r, palColor.colorData.g, palColor.colorData.b, palColor.colorData.a);	
	}
	
	function addColourOverride(selNode, palette){
		var palettePath = palette.getPath() + "/" + palette.getName() + ".plt";
		var co = addNodeUnder(selNode, palette.getName() + "_OVERRIDE", "COLOR_OVERRIDE_TVG");
		if(!co){
			Print("Fail to add color override node!");
			return false;
		}
		var coObj = node.getColorOverride(co);
		coObj.clearPalettes();
		coObj.addPalette(palettePath);
		return co;
	}
	
	function connectNodeUnder(nodeSel, nodeToMove){//conecta o node embaixo do node selecionado e se ja existir um node igual, conecta do lado
		var parentSel = node.parentNode(nodeSel);
		var parentDst = node.parentNode(nodeToMove);
		var newNode = nodeToMove;
		
		if(parentSel != parentDst){
			newNode = node.moveToGroup(nodeToMove, parentSel);
		}

		var nodeCoordSel = new QRect(node.coordX(nodeSel), node.coordY(nodeSel), node.width(nodeSel), node.height(nodeSel));
		var nodeCoordDst = new QRect(node.coordX(newNode), node.coordY(newNode), node.width(newNode), node.height(newNode));
		

		var nodePort = node.numberOfOutputPorts(nodeSel) -1;
		var nextNode = node.dstNode(nodeSel, nodePort, 0);
		var end_connection = nextNode == "" || node.type(nextNode) == node.type(nodeToMove);
		
		if(end_connection){
			nodeCoordSel.translate(nodeCoordDst.width(), 80);
		} else {
			nodeCoordSel.moveTo(nodeCoordSel.center().x() - nodeCoordDst.width()/2, nodeCoordSel.y() + 80);
		}
		
		if(!end_connection){
			var compPort = node.dstNodeInfo(nodeSel, nodePort, 0).port;						
			node.unlink(nextNode, compPort);
			node.link(newNode, 0, nextNode, compPort);
		}

		node.link(nodeSel, nodePort, newNode, 0);
		node.setCoord(newNode, nodeCoordSel.x(), nodeCoordSel.y());
		Print("Node connected under!");
	}
	
	function addNodeUnder(nodeSel, nodeName, type){//add node e conecta embaixo do nodeSel (retirado dos utils)
		var newNode = node.add(node.root(), nodeName, type, 0, 0, 0);
		connectNodeUnder(nodeSel, newNode);
		return newNode;
	}
	
	function importTPL(tplPath){//import tpl into scene and return node list of imported nodes in root top view
		var before = node.subNodes(node.root());
		copyPaste.setPasteSpecialCreateNewColumn(true);
		copyPaste.usePasteSpecial(true);
		copyPaste.setExtendScene(false);
		copyPaste.setPasteSpecialColorPaletteOption("DO_NOTHING");
		if(!copyPaste.pasteTemplateIntoScene(tplPath, "", 1)){
			Print("Error importing tpl : " + tplPath + " into scene!");
			return false;
		}
		var after = node.subNodes(node.root());
		return after.filter(function(x) { return before.indexOf(x) == -1});
	}
}