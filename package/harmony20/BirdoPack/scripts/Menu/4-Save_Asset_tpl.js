include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*v2.0
-------------------------------------------------------------------------------
Name:		BD_2-ScriptLIB_Geral.js

Description:	util do BirdoPack para salvar tpl de Assets na birdoLibrary

Usage:		Usado pela supervisao de RIG para salvar o tpl do asset selectionado na nodeView

Author:		Leonardo Bazilio Bentolila

Created:	Julho, 2021.

Copyright:  leobazao_@Birdo
-------------------------------------------------------------------------------
*/

//TODO MAIN:
	// falta refazer a funcao que renomeia os nodes nao mudar nada quando for anim - OK
	//escolher o nome ANIM pra animacao - sim... ja rolou! 
	// falta fazer um jeito pra pegar o main folder do asset na lib (descidir se resolve isso no python (mais facil)
	
	
	//NOVA IDEIA:
		//fazer salvar tudo no temp sem nome do item no template e somente decidir o nome no py de envio mesmo - escolhe nome e escolhe o numero no py - OK
		//lembrar de botar a flag de ANIM pro script py de envio - OK
	
	
function SaveAssettpl(){
	
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	var asset_type = projectDATA.entity.type == "ASSET" ? projectDATA.entity.asset_type : null;
	
	if(projectDATA.entity.type != "ASSET"){
		Print("[SAVEASSET]This is a shot entity scene, will only accpet saving animation library!");
	}
	
	var selNodes = getSelection(asset_type);// pega nodes selecionados

	if(!selNodes){
		return;
	}
	
	var nodeList = BD2_ListNodesInGroup(selNodes.asset, "", true);//lista todos os nodes se for grupo, se nao retorna somente o read
	
	if(!selNodes["is_animation_lib"]){//only cheks if is not animation lib save
		if(!checkASSET(selNodes, projectDATA.entity.name, nodeList)){//verifica se esta tudo ok pra gerar o TPL
			MessageLog.trace("[ERROR][SAVETPLBIRDOASSET] Save TPL ASSET Cancelado! Asset nao esta pronto para enviar para Birdo ASSETS!");
			return;
		}
	}
	
	var listaPaletaUsadas = require(projectDATA["paths"]["birdoPackage"] + "utils/checkNodesPallet.js").checkNodesPallet(nodeList);//lista as paletas usadas no asset

	if(!checkPallets(listaPaletaUsadas)){
		return;
	}
	var assetData = null;
	if(!selNodes["is_animation_lib"]){
		assetData = getAssetsProjectData(projectDATA);
	} else {
		var asset_prefix = selNodes.asset_name.slice(0,2);
		var typeFullName = asset_prefix == "CH" ? "Character" : asset_prefix == "PR" ? "Prop": asset_prefix;
		assetData = {};
		assetData[typeFullName] = [
				{
				"code": selNodes.asset_name,
				"type": "Asset",
				"id": null,
				"shots": [],
				"sg_version_template": selNodes.asset_name
				}
			];
	}
	if(!assetData){
		MessageBox.warning("ERRO ao pegar as informacoes de Assets da pipeline do projeto! Avise a Direcao Tecnica!", 0 ,0 );
		return false;
	}
	Print("ASSETDATA: ");
	Print(assetData);

	var dialog = new initiateUI(selNodes, projectDATA, assetData);
	dialog.ui.show();

///////////////////FUNCOES EXTRAS MAIN///////////////
	function warningAsk(msg){
		var ask = MessageBox.warning(msg, 3, 4);
		return ask == 3;
	}
	
	function getSelection(assetType){
		var nodes_sel = {};
		var selected_nodes = selection.selectedNodes();
		var is_anim_library = false;
		var regex_rig = /\w{2}\d{4}_.+(-v\d+)?/;
		var regex_rig_full = /\w{3}\..+-v\d+/;

		if(selected_nodes.length == 1){
			is_anim_library = is_anim_selection(selected_nodes);
			if(!is_anim_library){
				MessageBox.warning("Selecao de nodes invalida para banco de ANIM. Selecione o grupo do rig fechado na timeline, com a selecao de frames da animacao a ser salva!",0 ,0);
				Print("[SAVEASSET][ERROR]Animation selection invalid!");
				return false;
			}
		} else if(selected_nodes.length != 2){
			MessageBox.warning("A Selecao de nodes na NodeView nao esta correta!\nSelecione apenas o ASSET e sua PEG!\n\n-Se For RIG, lembre de selecionar o BackDrop!\n-Se somente existe o Node Drawing do asset sem PEG,\ncrie uma PEG!\n\nSelecione corretamente e tente de novo!", 0,0);
			Print("[SAVEASSET][ERROR] Invalid Node selection!");
			return false; 
		}
		
		var nodeASSET = selected_nodes[0];
		var nodePEG = is_anim_library ? false : selected_nodes[1];
		
		if(!is_anim_library){
			if(node.srcNode(selection.selectedNode(1), 0) == selection.selectedNode(0)){//troca se ele nao ler certo a selecao [0] e [1]
				nodeASSET = selection.selectedNode(1);
				nodePEG = selection.selectedNode(0);
			}
		}
		
		nodes_sel["peg"] = nodePEG;
		nodes_sel["asset"] = nodeASSET;
		
		//is is animation
		if(is_anim_library){
			nodes_sel["rigFull"] = getFullRigGroup(nodeASSET);
			nodes_sel["rigTypeList"] = ["ANIM"];
		} else {
		
			if(assetType == "CH" && node.type(nodeASSET) == "GROUP"){//se for um CHAR e grupo
				nodes_sel["rigFull"] = getFullRigGroup(nodeASSET);
			} else {
				nodes_sel["rigFull"] = null;				
			}
			nodes_sel["rigTypeList"] = nodes_sel["rigFull"] ? ["FULL", "SIMPLE"] : ["SIMPLE"];
		}
		
		nodes_sel["is_animation_lib"] = is_anim_library;
		nodes_sel["asset_name"] = is_anim_library ? node.getName(nodeASSET).replace(/(-|_)\d$/, "") : projectDATA.entity.name;
		return nodes_sel;

		////funcao extra///
		function getFullRigGroup(rigGroup){//acha o grupo do rigfull dentro do grupo externo do rig
			var subs = node.subNodes(rigGroup).filter(function(x) {return node.isGroup(x)});
			var regex_peg = /DESLOC|PATH/;
			if(subs.length == 1 && regex_peg.test(node.getName(node.srcNode(subs[0], 0)))){
				return subs[0];
			} else {
				for(var i=0; i< subs.length; i++){
					if(regex_rig_full.test(node.getName(subs[i]))){
						return subs[i];	
					}
				}
			}		
			return false;
		}
		function is_anim_selection(selNodes){//return true if node selection is anim node valid
			return selection.isSelectionRange() && node.isGroup(selNodes[0]) && regex_rig.test(node.getName(selNodes[0])) && selNodes.length == 1;	
		}
	}
	
	function checkASSET(asset_sel, asset_name, node_list){//funcao para verificar se o ASSET esta pronto para gerar TPL
		var tipo = node.type(asset_sel.asset);
		var numFrames = frame.numberOf();

		if(tipo == "READ"){//se for um prop simples (somente um drawing)
			var colunaD = node.linkedColumn(asset_sel.asset,"DRAWING.ELEMENT");
			var drawingsIn = column.getDrawingTimings(colunaD);
			if(drawingsIn.indexOf("Zzero") == -1){
				MessageBox.information("Falta criar o 'Zzero' para este ASSET!\nUse o Script BD_Zzero!");
				return false;
			}
			if(numFrames  < drawingsIn.length -1){
				MessageBox.information("Deixe este arquivo da seguinte forma antes de continuar:\n -Todos Drawings Expostos na Timeline (exeto o 'Zzero');\n - Somente os Drawings q serao usados na Library (Use o BD_CleanLibrary para apagar os nao usados);\n -A duracao dos frames acabando junto com os drawings expostos na Timeline;\nOBS: Se vc esta fazendo uma atualizacao de vistas novas para um prop existente, mantenha todos os drawings expostos na timeline, incluindo as poses novas e antigas!");
				return false;
			}
		} else if(tipo == "GROUP" && asset_name.substring(0, 2) == "CH"){//se for um RIG de personagem
			if(!reviewRIG(node_list)){
				return false;
			}
		}

		if(node.getTextAttr(asset_sel.peg, 1,"PIVOT.X") == 0 && node.getTextAttr(asset_sel.peg, 1,"PIVOT.Y") == 0){// check pivot da PEG
			if(!warningAsk("O Pivot da peg STAGE parece errado!\nDeseja continuar?!")){
				return false;
			}
		}
		return true;
	}
	
	function reviewRIG(node_list){//verifica os drawings com nome no padrao, se contem os nodes FULL, se contem grupos com -G no nome
		var counter_number = 0;
		var counter_empty = 0;
		var counter_Zzero = 0;

		var regex_sujeira = /(-G)$/;
		var regex_FULL = /FULL/;
		var isNamesOk = true;
		var isFullOK = false;
		var drawing_list = [];

		for(var i=0; i<node_list.length; i++){
			drawing_list = [];
			
			node.setShowTimelineThumbnails(node_list[i], false);//desliga o show thumbnail do node na timeline

			if(regex_sujeira.test(node_list[i]) && node.type(node_list[i]) == "GROUP"){
				Print("[SAVEASSET]Node com sujeira no nome: " + node_list[i]);
				isNamesOk = false;
			}

			if(regex_FULL.test(node_list[i])){
				isFullOK = true;
			}
		
			if(node.type(node_list[i]) != "READ"){
				continue;
			}

			var coluna = node.linkedColumn(node_list[i], "DRAWING.ELEMENT");

			if(!checkExposicao(coluna)){
				Print("node: " + node_list[i]);
				counter_empty++;
			}
		
			var timmings = column.getDrawingTimings(coluna);

			if(timmings.indexOf("Zzero") == -1){
				counter_Zzero++;
			}

			for(var j =0; j<timmings.length; j++){//pega os que tem nome q comeca com numero
				if(!isNaN(timmings[j][0])){
					drawing_list.push(timmings[j]);
				}
			}

			if(drawing_list.length > 0){
				Print("[SAVEASSET]o node contem drawings com nome fora do padrao: " + node_list[i] + " ===> drawings: " + drawing_list);
				counter_number++;
			}

		}
		
		if(!isFullOK){
			if(!warningAsk("Este RIG nao contem os nodes FULL que deveria!!\nDeseja continhar mesmo assim??")){
				return false;
			}
		}

		if(counter_number > 0){
			if(!warningAsk("Este RIG contem "  + counter_number + " nodes com desenhos fora do padrao de nome!\nDeseja continhar??")){
				return false;
			}
		}
		
		if(counter_empty > 0){
			MessageBox.warning("Este RIG contem "  + counter_empty + " nodes com exposicao vazia! Use o script 'EmptyToZzero' na timeline para resolver isso! Ou acerte o tamanho da timeline, deixe somente as poses necessarias expostas na timeline!", 0, 0);
			return false;
		}
				
		if(counter_Zzero > 0){
			MessageBox.warning("Este RIG contem "  + counter_Zzero + " nodes sem o Zzero criado! Acerte isso antes de gerar o TPL!", 0,0);
			return false;
		}
		
		if(!isNamesOk){
			if(!warningAsk("Este RIG contem grupos com nome sujo ('-G') no final!\nDeseja continhar mesmo assim??")){
				return false;
			}
		}

		return true;

	
		function checkExposicao(drawing_colun){//check se o drawing contem exposicao vazia
			var allFrames = frame.numberOf();
	 		for(var i=1; i<=allFrames; i++){
				var exp = column.getEntry(drawing_colun, 1, i);
				if(exp == ""){
					Print("[NODE COM EXP VAZIA] : " + column.getDisplayName(drawing_colun) + " no frame : " + i);
					return false;
				}
			}
			return true;
		}
	}
	
	function checkPallets(pltList){/*roda o resultado do script checkNodesPallet;
		[0] - nodeArray;
		[1] - drawArray;
		[2] - colorArray - subArray cores usadas por draw;
		[3] - PaletteAttay - subArray Palettas usadas por draw;
		*/
		var readNodes = pltList[0];
		var drawList = pltList[1];
		var corList = pltList[2];
		var nodesPalett = pltList[3];
		var usedPal = [];

		for(var i=0; i<nodesPalett.length; i++){
			for(var y=0; y<nodesPalett[i].length; y++){
				if(usedPal.indexOf(nodesPalett[i][y]) != -1){
					continue;	
				}
				usedPal.push(nodesPalett[i][y]);
			}
		}

		if(usedPal.length > 1){
			var mensagem = "Este ASSET utiliza mais de uma Palette: \n";
			for(item in usedPal){
				mensagem += (" -" + usedPal[item] + "\n");
			}
			mensagem += "Deseja criar o TPL mesmo assim?\n";
			if(!warningAsk(mensagem)){
				return false;
			}
		}
		return true;
	}
	
	
	function getAssetsProjectData(projData){

		var pythonPath = BD2_FormatPathOS(projData.birdoApp + "venv/Scripts/python");
		var pyFile = BD2_FormatPathOS(projData.birdoApp + "app/utils/" + projData.pipeline.type + "_get_asset_data.py");
		var tempfolder = specialFolders.temp + "/BirdoApp/" + projData.pipeline.type + "/BirdoASSET/";

		if(!BD1_DirExist(tempfolder)){
			BD1_createDirectoryREDE(tempfolder);
		}
		
		var jsonFile = tempfolder + "info" + new Date().getTime() + ".json";
		
		var loadingScreen = BD2_loadingBirdo(projData.birdoApp, 15000, "geting_project_asset_information...");
		var assetTypeName = projData.getAssetTypeFullName();
		var project_index = projData.id;

		var commands = [];
		commands.push(pythonPath);
		commands.push(pyFile);
		commands.push(project_index);
		commands.push(assetTypeName);
		commands.push(jsonFile);
		
Print("Chamada Python1: ");
MessageLog.trace(commands);
		var ret = Process.execute(commands);

		if(ret != 0){
			loadingScreen.terminate();
			Print("[GETASSETSDATA][ERROR] Fail to run python script!");
			return false;
		}

		if(loadingScreen.isAlive()){
			Print("closing loading screen...");
			loadingScreen.terminate();
		}
		
		if(BD1_FileExists(jsonFile)){
			return BD1_ReadJSONFile(jsonFile);
		} else {
			Print("Falha ao pegar informacoes dos assets do Projeto!");
			return false;
		}
	}
	
}


function initiateUI(selectionData, projData, projectAssetData){

	var uiPath = projData.paths.birdoPackage + "ui/BD_SaveASSET.ui";
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	this.projData = projData;
	this.ui.progressBar.hide();
	
	
	//sets the initial prefix digits numberOf
	var max = 999;
	if(projData.pipeline.assets_digits == 4){
		max = 9999;
	}
	this.ui.assetIndex.maximum = max;

	/////////////////CALL BACKS
	this.updateAssetInfo = function(){//atualiza as label infos
				
		var version = this.ui.groupRIG.spinVersion.text;
		if(!this.ui.comboAssetName.currentText){
			this.ui.groupAsset.labelName.text = "";
			this.ui.groupAsset.labelID.text = "";
			this.ui.groupAsset.labelType.text = "";
			this.ui.groupAsset.label_shortName.text = "";
			return;
		}
		
		var assetIndex = this.ui.assetIndex.text;
		var typeFullName = selectionData.is_animation_lib ? Object.keys(projectAssetData)[0] : this.projData.getAssetTypeFullName();
		
		var namesObj = getAssetList(selectionData.is_animation_lib, assetIndex, projectAssetData, typeFullName, this.projData.pipeline.assets_digits);
		
		var assetName = namesObj["listNames"][this.ui.comboAssetName.currentIndex];
		var itemObj = projectAssetData[Object.keys(projectAssetData)[0]][0];
		var assetType = selectionData.is_animation_lib ? itemObj["code"].slice(0,2) : this.projData.entity.asset_type;
		
		var assetNameShort = namesObj["listShortNames"][this.ui.comboAssetName.currentIndex];
		this.ui.groupAsset.labelName.text = assetIndex + "_" + assetName + "." + version;
		this.ui.groupAsset.labelID.text =  namesObj["listObj"][this.ui.comboAssetName.currentIndex]["id"];
		this.ui.groupAsset.labelType.text = assetType;
		this.ui.groupAsset.label_shortName.text = assetIndex + "_" + assetNameShort + "." + version;
	}
	
	this.updateName = function(){//atualiza estado dos itens ativados (callback do comboName);
		this.ui.groupRIG.enabled = this.ui.comboAssetName.currentText != "";
		this.ui.saveButton.enabled = this.ui.comboAssetName.currentText != "";
		this.updateAssetInfo();
	}

	this.updateCheckBox = function(){//atualiza o comboboxName (callback do checkBoxShortName)
		this.ui.comboAssetName.clear();

		var typeFullName = selectionData.is_animation_lib ? Object.keys(projectAssetData)[0] : this.projData.getAssetTypeFullName();
		var namesObj = getAssetList(selectionData.is_animation_lib, this.ui.assetIndex.text, projectAssetData, typeFullName, this.projData.pipeline.assets_digits);
		var items_list = this.ui.checkShortName.checked ? namesObj["listShortNames"] : namesObj["listNames"];//define a lista de nomes (short ou name)
		this.ui.comboAssetName.addItems(items_list);
		
		//sugere o item com nome da cena
		var currentAssetName = projData.entity.name;
		var prefix = currentAssetName.split("_")[0];

		var index = this.ui.comboAssetName.findText(currentAssetName.replace(prefix + "_", ""), "Qt.MatchExactly");
		if(index == -1){
			Print("Scene name is not an ShortName Match!");
		} else {
			Print("Scene name has a match in ShortName list!");
			this.ui.comboAssetName.setCurrentIndex(index);
		}		
		
	}

	this.updateAssetIndex = function(){//atualiza as informacoes do comboIndex e comboName
		this.ui.comboAssetName.clear();
		var itemObj = projectAssetData[Object.keys(projectAssetData)[0]][0];
		
		var assetType = selectionData.is_animation_lib ? itemObj["code"].slice(0,2) : this.projData.entity.asset_type;
		var numVal = this.ui.assetIndex.value;

		var prefix = "";
		if(numVal < 10){
			prefix = this.projData.pipeline.assets_digits == 4 ? "000" : "00";
		} else if(numVal < 100){
			prefix = this.projData.pipeline.assets_digits == 4 ? "00" : "0";
		} else if(numVal < 1000){
			prefix = this.projData.pipeline.assets_digits == 4 ? "0" : "";
		}
	
		this.ui.assetIndex.prefix = assetType + prefix;
	
		this.updateCheckBox();
		this.updateAssetInfo();
	}

	this.updateVersion = function (){//atualiza as versoes do rig (callback do spin version)
		var numVal = this.ui.groupRIG.spinVersion.value;
		var prefix = "v00";
		if(numVal < 100 && numVal > 9){
			prefix = "v0";
		} else if(numVal > 99){
			prefix = "v";
		}
		this.ui.groupRIG.spinVersion.prefix = prefix;
		this.updateAssetInfo();
	}
	
	this.updateRigType = function (){//atualiza infos do rigType 
		if(this.ui.groupRIG.comboRigType.currentText == "FULL"){
			this.ui.groupRIG.label_full.show();
			this.ui.groupRIG.nodeFullPath.show();
			this.ui.groupRIG.label_warningFULL.show();
		} else {
			this.ui.groupRIG.label_full.hide();
			this.ui.groupRIG.nodeFullPath.hide();
			this.ui.groupRIG.label_warningFULL.hide();
		}
	}
	
	this.onSaveTpl = function(){//salva o tpl (callback do saveButton)
		
		if(this.ui.comboAssetName.currentText == ""){
			MessageBox.warning("Escolha um Nome Valido!", 0, 0);
			return;
		}
		
		if(!checkSelectionIsStillValid(selectionData)){
			MessageBox.information("Voce deselecionou os nodes inicialmente selecionados! Selecione corretamente de novo!");
			return;
		}
		
		var assetInfo = {
			isAnim : selectionData.is_animation_lib,
			pegNode : selectionData.peg,
			assetNode : selectionData.asset,
			fullNode : selectionData.rigFull, 
			version : selectionData.is_animation_lib ? "ANIM" : this.ui.groupRIG.spinVersion.text,
			id : selectionData.is_animation_lib ? "null" : this.ui.groupAsset.labelID.text
		};
		
		var typeFullName = selectionData.is_animation_lib ? Object.keys(projectAssetData)[0] : this.projData.getAssetTypeFullName();
		assetInfo["typeFullName"] = typeFullName;
		
		if(typeFullName == "Misc"){
			assetInfo["prefixo"] = "MI";
		} else {
			assetInfo["prefixo"] = this.ui.assetIndex.text;
		}
		
		var namesObj = getAssetList(selectionData.is_animation_lib, this.ui.assetIndex.text, projectAssetData, typeFullName, this.projData.pipeline.assets_digits);
		assetInfo["assetData"] = selectionData.is_animation_lib ? namesObj.listObj[0] : namesObj.listObj[this.ui.comboAssetName.currentIndex];
		var assetlist = namesObj.listNames;
		assetInfo["assetName"] = assetlist[this.ui.comboAssetName.currentIndex];
		assetlist.shift();
		assetInfo["assetsList"] = assetlist;
		var saveTPL_script = this.projData["paths"]["birdoPackage"] + "utils/" + this.projData.server.type + "_saveTPL.js";
		Print(saveTPL_script);
		Print(assetInfo);
		var save_tpl = require(saveTPL_script).saveTPL(this, this.projData, assetInfo);//salva o tpl no destino;
		if(!save_tpl){
			Print("Falha ao salvar o tpl do asset no Server! Veja o log para mais informacoes, e avise a Direcao Tecnica!");
		} else {
			Print("Asset Save done!");
		}
		this.ui.close();
	}


	////////////// CONNECTIONS //////////////////////
	this.ui.assetIndex["valueChanged(int)"].connect(this, this.updateAssetIndex);
	this.ui.checkShortName.toggled.connect(this,this.updateCheckBox);

	this.ui.comboAssetName["currentIndexChanged(QString)"].connect(this, this.updateName);
	this.ui.groupRIG.comboRigType["currentIndexChanged(QString)"].connect(this, this.updateRigType);
	this.ui.groupRIG.spinVersion["valueChanged(int)"].connect(this,this.updateVersion);
	this.ui.saveButton.clicked.connect(this, this.onSaveTpl);
	this.ui.cancelButton.clicked.connect(this, this.ui.close);

	//MUDAR ITENS DEPOIS DOS CONNECTS
	updateInitialValues(this, selectionData);
	configureRigTypes(this, selectionData);
	
	////FUNCOES EXTRAS UI
	function getAssetList(is_anim_lib, assetPrefix, assetData, assetTypeName, assetsDigits){//pega as infos do objeto de assets do projeto baseado no prefix atual
		var finalObj = {};
		var nameList = [""];
		var shortNameList = [""];
		var prefix_regex = new RegExp("^(\\w{2}\\d{" + assetsDigits + "}_)", "i");
		//if is anim lib, make object simpler
		if(is_anim_lib){
			finalObj["listObj"] = assetData[assetTypeName];
			finalObj["listNames"] = ["", "ANIM_FX_LIQUIDO", "ANIM_FX_FOGO", "ANIM_FX_AREIA", "ANIM_FX_GRAFICO", "ANIM_FX_SPLASH", "ANIM_FX_FUMACA", "ANIM_FX_BRILHO", "ANIM_BANCO", "ANIM_ACTING", "ANIM_WALK", "ANIM_RUN", "ANIM_JUMP", "ANIM_SENTADO"];
			finalObj["listShortNames"] = [];
			finalObj["listNames"].forEach(function(x){
							var reg = /ANIM_(FX_)?/;
							finalObj["listShortNames"].push(x.replace(reg, ""));
						});
			return finalObj;
		}
		
		if(assetTypeName == "Misc"){
			assetPrefix = "MI";
			prefix_regex = /MI_/;
		}
		
		var objListFiltered = assetData[assetTypeName].filter(function (obj){ return obj["code"].split("_")[0] == assetPrefix});

		objListFiltered.sort(sortObjects);
		objListFiltered.forEach(function (item){ 
									nameList.push(item["code"].replace(prefix_regex, ""));
									var shortName = item["sg_version_template"].replace(prefix_regex, "");
									shortNameList.push(shortName.replace(/(_v\d+)$/, ""));
									});
		objListFiltered.unshift("");
		finalObj["listObj"] = objListFiltered;
		finalObj["listNames"] = nameList;
		finalObj["listShortNames"] = shortNameList;
		return finalObj;
		//funcao callback do sort de objetos//
		function sortObjects(a, b){//funcao para organizar objetos em ordem alfabetica!!!
			if(a.code < b.code){ 
				return -1;
			}
			if(a.code > b.code){
				return 1;
			}
			return 0;
		};
	}
	
	function updateInitialValues(self, selObj){//checa se o nome do arquivo inicial existe no sistema do projeto
		var currentAssetName = selObj["asset_name"];
		var prefix = currentAssetName.split("_")[0];
		var assetIndexStart = parseFloat(prefix.replace(/\w{2}/, ""));//numero no asset do arquivo aberto
		
		//tratamento se for MISC
		if(currentAssetName.slice(0,2) == "MI"){
			assetIndexStart = 0;
			self.ui.assetIndex.enabled = false;
			self.updateCheckBox();
		}
		
		self.ui.assetIndex.setValue(assetIndexStart);

		//if is anim, set the name
		if(selObj["is_animation_lib"]){
			//self.ui.comboAssetName.addItem(currentAssetName.replace(prefix + "_", ""));
			self.ui.groupRIG.comboRigType.addItem("ANIM");
			return;
		}		
		
		var index = self.ui.comboAssetName.findText(currentAssetName.replace(prefix + "_", ""), "Qt.MatchExactly");
		if(index == -1){
			MessageBox.warning("Este Arquivo nao esta com o um nome de asset reconhecido no sistema do projeto! Escolha um nome da lista e mude o 'Asset Identifier' se necessario!\n\nOBS: SE optar por listar os nomes curtos ('short name'), o script inicialmente sugere o nome do arquivo se este for curto!\n\nIMPORTANTE: Confira no Site do projeto qual o nome correspondente para este asset que esta sendo salvo!!!", 0, 0);
		} else {
			self.ui.comboAssetName.setCurrentIndex(index);
		}
	}
	
	function configureRigTypes(self, selectionData){
		if(selectionData["is_animation_lib"]){
			self.ui.checkShortName.enabled = false
			self.ui.assetIndex.enabled = false;
			self.ui.groupRIG.spinVersion.enabled = false;
			self.ui.groupRIG.enabled = false;
			return;
		}	
		if(!selectionData.rigFull){
			self.ui.groupRIG.label_full.hide();
			self.ui.groupRIG.nodeFullPath.hide();
			self.ui.groupRIG.label_warningFULL.hide();			
		} else {
			self.ui.groupRIG.nodeFullPath.text = selectionData.rigFull;	
		}
		self.ui.groupRIG.comboRigType.addItems(selectionData.rigTypeList);
	}
	
	function checkSelectionIsStillValid(selObj){
		var currentSelected = selection.selectedNodes();
		if(selObj.is_animation_lib){
			return currentSelected.length == 1 && selection.isSelectionRange();
		}else {
			return currentSelected.length == 2;
		}
	}
	
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
}

exports.SaveAssettpl = SaveAssettpl;
