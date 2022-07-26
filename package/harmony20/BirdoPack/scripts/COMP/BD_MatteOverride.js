/*
-------------------------------------------------------------------------------
Name:		BD_MatteOverride.js

Description:	Este script adiciona um Colour-Override com o modo pallet-override para o matte branco (apenas linhas pretas) pra aplicar no personagem 

Usage:		Selecione a pallet q deseja criar, e aperte.

Author:		Leonardo Bazilio Bentolila

Created:	julho, 2022.
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
TODO : 

	verificar pq o addnode parou de funcionar - verificar novo bug...
	descobrir pq nao funciona o add all colors
	Melhorar o enable dos botoes da parte de palette manager
	testar melhor todas opcoes
	

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_MatteOverride(){
	
	var projData = BD2_ProjectInfo();
	
	if(!projData){
		MessageBox.warning("Erro ao logar infos do BirdoApp! Avise a DT!",0,0);
		return;
	}
	
	var paletteList = PaletteObjectManager.getScenePaletteList();

	var mattePalettePath = scene.currentProjectPath() + "/palette-library/_matte";
	var mattePalette = null;
	
	//creates pallet
	if(!BD1_FileExists(mattePalettePath + ".plt")){
		
		if(!BD2_AskQuestion("A palette '_matte' ainda nao foi criada nesta cena. Sera necessario salvar esta acao apos a criacao desta palette.\nDeseja continuar?")){
			Print("Canceled...");
			return;
		}
		
		mattePalette = paletteList.createPalette(mattePalettePath);
		//clean defalt color created with palette
		var defaltColor = mattePalette.getColorByIndex(0);
		mattePalette.removeColor(defaltColor.id);
		MessageBox.information("Palette '_matte' foi criada! Agora as cores clonadas serao adicionadas nessa paleta e usada como Palette-Override para os nodes criados!");
		scene.saveAll();
	} else {
		mattePalette = findPallet(mattePalettePath);
	}
	
	if(!mattePalette){
		MessageBox.warning("Algo deu errado! Palette nao foi criada corretamente!",0,0);
		return;
	}
		
	var d = new CreateInterface(projData, mattePalette, paletteList);
	d.ui.show();
	
	///EXTRA FUNCS
	function findPallet(palettePath){//retorna o objeto da pallet (se nao tiver na paletteList add a palette nova);
		var paletteName = BD1_fileBasename(palettePath);
		for(var i=0; i<paletteList.numPalettes; i++){
			var palett = paletteList.getPaletteByIndex(i);
			if(palett.getName() == paletteName){
				Print("Palette found at index " + i);
				return palett;
			}
		}
		Print("Pallet: " + paletteName + " is not in palette list. Adding palette...");
		return paletteList.addPalette(palettePath);
	}
}


function CreateInterface(projData, mattePalette, paletteList){
		
	var uiPath = projData.paths.birdoPackage + "ui/BD_MatteOverride.ui";
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	this.ui.groupAdvenced.hide();
	
	//fix windows size
	this.ui.setFixedSize(378, 304);
	
	//self variables
	this.addedColors = 0;
	this.currPalette = null;
	this.matteColour = mattePalette.nColors == 0 ? new QColor(255,255,255,255) : createQColor(mattePalette.getColorByIndex(0));//inicialmente branco se nao houver cores escolhidas
	this.ingoneColour = new QColor(0,0,0,255);//inicialmente preto
	
	//update clear button state
	this.ui.groupPalettes.pushRemoveColors.enabled = mattePalette.nColors > 0;


	//CALL BACKS
	this.changeButtonColor = function(buttonWidget, newColor){//atualiza a cor do botao 
		var rgbStr = "rgb(" + newColor.red() + "," + newColor.green() + "," + newColor.blue() + ")";
		var currStyle = buttonWidget.styleSheet;
		buttonWidget.styleSheet = currStyle.replace(/rgb\(\d+,\d+,\d+\)/, rgbStr);	
	}
	//update matte color button
	this.changeButtonColor(this.ui.groupAdvenced.pushMatteColor, this.matteColour);


	this.updateProgressBar = function(){
		var val = this.ui.progressBar.value;
		this.ui.progressBar.value = val + 1;	
	}
	
	this.enableButtons = function(enable){//habilita os botoes de palette
		this.ui.groupPalettes.pushAddColors.enabled = enable;
		this.ui.groupPalettes.pushRemoveColors.enabled = mattePalette.nColors > 0;
	}
	
	this.changeRadio = function(){
		this.ui.groupAdvenced.lineCorName.enabled = this.ui.groupAdvenced.radioCorName.checked;
		this.ui.groupAdvenced.pushIgnoreColor.enabled = this.ui.groupAdvenced.radioCorVal.checked;
	}	
	
	this.onCheckPalletOptions = function(){
		var showButtons = Boolean(this.currPalette) || this.ui.groupPalettes.radioAllColors.checked;	
		this.enableButtons(showButtons);
		this.ui.groupPalettes.pushSelPal.enabled = !this.ui.groupPalettes.radioAllColors.checked;
		this.ui.groupPalettes.labelPalette.enabled = !this.ui.groupPalettes.radioAllColors.checked;
		Print("Changed add colors mode...");
	}	
	
	this.onSelectPalette = function(){
		var currPal = paletteList.getPaletteById(PaletteManager.getCurrentPaletteId());
		var validPalette = true;
		if(currPal.getName() == mattePalette.getName() || !currPal.isValid()){
			MessageBox.warning("Palette selecionado e INVALIDA! Selecione uma palette valida na janela de cores!",0,0);
			this.currPalette = null;
			this.ui.groupPalettes.labelPalette.text = "";
			Print("Invalid palette selection!");
			validPalette = false;
			this.ui.progressBar.format = "Selecione uma palette valida!";
		} else {
			this.currPalette = currPal;
			this.ui.groupPalettes.labelPalette.text = this.currPalette.getName();
			Print("Palette selected: " + this.currPalette.getName());
			this.ui.progressBar.format = "Palette selected: " + this.currPalette.getName();
		}
		this.enableButtons(validPalette);
	}
	
	this.onAddColors = function(){
		scene.beginUndoRedoAccum("Add colors to MatteOverride");
		//reset counter;
		this.addedColors = 0;
		var paletteCounter = 0;
		if(this.ui.groupPalettes.radioChoosePal.checked){
			Print("Mode Palette is Choose Single Palette!");
			this.addPalleteColorsToMatteOverride(this.currPalette);
			paletteCounter++;
		} else {
			Print("Mode Palette is ALL colors Palette!");
			for(var i=0; i<paletteList.numPalettes; i++){
				var paleta = paletteList.getPaletteByIndex(i);
				if(paleta.getName() == mattePalette.getName() || !paleta.isValid() || !paleta.isLoaded()){
					Print("ignoring palette: " + paleta.getName());
					continue;
				}
				this.addPalleteColorsToMatteOverride(paleta);
				paletteCounter++;
			}
		}
		this.onUpdateColors();
		this.ui.progressBar.clear();
		this.ui.progressBar.format = "Palettes: " + paletteCounter + " - colors: " + this.addedColors;
		Print(paletteCounter + " palettes added and " + this.addedColors + " colors added");
		
		scene.endUndoRedoAccum();
	}	
	
	this.onClearColors = function(){
		var delete_counter = 0;
		
		this.ui.progressBar.maximum = mattePalette.nColors - 1;

		for(var i=mattePalette.nColors-1; i>=0; i--){
			this.updateProgressBar();
			var cor = mattePalette.getColorByIndex(i);
			this.ui.progressBar.format = "deleting... " + cor.name;
			Print("...deleting color: " + cor.name);
			mattePalette.removeColor(cor.id);
			delete_counter++;
		}
		this.enableButtons(this.ui.groupPalettes.radioAllColors.checked);
		
		Print("cores deletadas do mattePalette: " + delete_counter);
		this.ui.progressBar.format = "MattePalette foi limpa! removidos: " + delete_counter;
		this.ui.progressBar.value = 0;
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
			
			if(isColorInMattePallete(mattePalette, cor)){
				Print("Color is already in the mattePalette: " + cor.name);
				continue;
			}
			if(this.isColorIgnored(cor)){
				Print("Ignoring color: " + cor.name);
				counterIgnored++;
				continue;
			}
			var cloneColor = mattePalette.cloneColor(cor);
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
			isIgnore = this.ui.groupAdvenced.lineCorName.text == color.name;
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

		this.ui.groupAdvenced.lineCorName.enabled = showIgnore && this.ui.groupAdvenced.radioCorName.checked;
		this.ui.groupAdvenced.pushIgnoreColor.enabled = showIgnore && this.ui.groupAdvenced.radioCorVal.checked;
		Print("Use ignore colors: " + showIgnore);
	}
	
	this.onShowAdvanced = function(){
		if(this.ui.checkAdvanced.checked){
			this.ui.groupAdvenced.show();
			Print("Showing advanced options...");
			this.ui.setFixedSize(378, 480);
		} else {
			this.ui.groupAdvenced.hide();
			Print("Hiding advanced options...");
			this.ui.setFixedSize(378, 304);
		}
	}
	
	this.onUpdateColors = function(){//callback do botao de atualizar as cores
		//check if matteOverride palette has no color yet
		if(mattePalette.nColors == 0){
			this.ui.progressBar.format = "No color in the MatteOverride Palette!";
			Print("Nenhuma cor para modificar!");
			return;
		}
		scene.beginUndoRedoAccum("Update colors in MatteOverride");
		var counter_repaint = 0;
		var counter_removed = 0;
		this.ui.progressBar.maximum = mattePalette.nColors - 1;

		for(var i=mattePalette.nColors-1; i>=0; i--){
			this.updateProgressBar();
			var cor = mattePalette.getColorByIndex(i);
			var originalColor = paletteList.findPaletteOfColor(cor.id).getColorById(cor.id);//cor na palete original
			this.ui.progressBar.format = "analizing... " + cor.name;
			Print("...updating color: " + cor.name);
			
			if(this.isColorIgnored(originalColor)){
				Print("color to ignore: " + originalColor.name);
				mattePalette.removeColor(cor.id);
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
	}
	
	this.onAddNode = function(){
		var selNode = selection.selectedNode(0);
		if(!selNode){
			MessageBox.warning("Selecione um node para aplicar o matte!",0,0);
			return;
		}
		
		scene.beginUndoRedoAccum("Add MatteOverride node");
		var co = addColourOverride(selNode, mattePalette);
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
	this.ui.checkAdvanced.toggled.connect(this, this.onShowAdvanced);
	
	this.ui.groupPalettes.radioAllColors.toggled.connect(this, this.onCheckPalletOptions);

	this.ui.groupAdvenced.radioCorName.toggled.connect(this, this.changeRadio);
	this.ui.groupAdvenced.radioCorVal.toggled.connect(this, this.changeRadio);
	
	this.ui.groupAdvenced.checkIgnore.toggled.connect(this, this.onCheckIgnore);

	this.ui.groupPalettes.pushSelPal.clicked.connect(this, this.onSelectPalette);
	this.ui.groupPalettes.pushAddColors.clicked.connect(this, this.onAddColors);
	this.ui.groupPalettes.pushRemoveColors.clicked.connect(this, this.onClearColors);

	this.ui.groupAdvenced.pushMatteColor.clicked.connect(this, this.onSelectMatteColor);
	this.ui.groupAdvenced.pushIgnoreColor.clicked.connect(this, this.onSelectIgnoreColor);
	this.ui.groupAdvenced.pushUpdateColors.clicked.connect(this, this.onUpdateColors);

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
	
	function pickColor(currColor){//dialog para escolher cor
		var d = new QColorDialog;
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
		var co = addNodeUnder(selNode, "MATTE_OVERRIDE", "COLOR_OVERRIDE_TVG");
		if(!co){
			Print("Fail to add color override node!");
			return false;
		}
		var coObj = node.getColorOverride(co);
		coObj.clearPalettes();
		coObj.addPalette(palettePath);
		return co;
	}

	function addNodeUnder(nodeSel, nodeName, type){//add node e conecta embaixo do nodeSel (retirado dos utils)
		var parentGroup = node.parentNode(nodeSel);
		var x = node.coordX(nodeSel);
		var y = node.coordY(nodeSel);
		var newY = y + 80;
		var newX;
	
		var nodePort = node.numberOfOutputPorts(nodeSel) -1;
		var nextNode = node.dstNode(nodeSel, nodePort, 0);
		
		var end_connection = nextNode == "";

		if(node.type(nextNode) == "COLOR_OVERRIDE_TVG" && node.getName(nextNode).indexOf("MATTE")!= -1){ 
			MessageBox.warning("Aparentemente ja tem um MatteOverride conectado neste node!",0,0);
			return false;				
		}
		
		if(end_connection){
			newX = x + 50;
		} else {
			newX = x;
		}
		
		var newNode = node.add(parentGroup, nodeName, type, newX, newY, 0);

		if(!end_connection){
			var compPort = node.dstNodeInfo(nodeSel, nodePort, 0).port;						
			node.unlink(nextNode, compPort);
			node.link(newNode, 0, nextNode, compPort);
		}

		node.link(nodeSel, nodePort, newNode, 0);
		return newNode;
	}
}