include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*v2.0
-------------------------------------------------------------------------------
Name:		BD_2-ScriptLIB_Geral.js

Description:	Script do Birdoapp para salvar itens na library de assets

Usage:		Usado pela supervisao de RIG para salvar o tpl do asset selectionado na nodeView

Author:		Leonardo Bazilio Bentolila

Created:	Julho, 2021. (revisado: fevereiro, 2025)

Copyright:  leobazao_@Birdo
-------------------------------------------------------------------------------
*/

	
function SaveAssettpl(){
	
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//checa se a entity e um asset type
	var asset_type = projectDATA.entity.type == "ASSET" ? projectDATA.entity.asset_type : null;
	if(projectDATA.entity.type != "ASSET"){
		Print("[SAVEASSET]This is a shot entity scene, will only accpet saving animation library!");
	}
	
	var saveTPL_script = projectDATA["paths"]["birdoPackage"] + "utils/saveTPL.js";
	var utils = require(saveTPL_script);
	
	var selNodes = utils.getSelection(asset_type);// pega nodes selecionados
	if(!selNodes){
		return;
	}
	
	var nodeList = BD2_ListNodesInGroup(selNodes.asset, "", true);//lista todos os nodes se for grupo, se nao retorna somente o read
	if(!selNodes["is_animation_lib"]){//only cheks if is not animation lib save
		if(!utils.checkASSET(selNodes, projectDATA.entity.name, nodeList)){//verifica se esta tudo ok pra gerar o TPL
			MessageLog.trace("[ERROR][SAVETPLBIRDOASSET] Save TPL ASSET Cancelado! Asset nao esta pronto para enviar para Birdo ASSETS!");
			return;
		}
	}
	
	//update mc data info
	selNodes["mcs"] = utils.checkMCnodes(nodeList);
	
	//check rig selected palettes
	var listaPaletaUsadas = require(projectDATA["paths"]["birdoPackage"] + "utils/checkNodesPallet.js").checkNodesPallet(nodeList);//lista as paletas usadas no asset
	if(!utils.checkPallets(listaPaletaUsadas)){
		return;
	}
	
	var assetData = null;
	if(!selNodes["is_animation_lib"]){
		assetData = utils.getAssetsProjectData(projectDATA);
	} else {
		selNodes["mcs"] = null;
		var asset_prefix = selNodes.asset_name.slice(0,2);
		var typeFullName = projectDATA.getAssetTypeFullName();
		assetData = {};
		assetData[typeFullName] = [
				{
				"code": selNodes.asset_name,
				"type": "Asset",
				"id": null,
				"scenes": [],
				"short_name": selNodes.asset_name
				}
			];
	}
	if(!assetData){
		MessageBox.warning("ERRO ao pegar as informacoes de Assets da pipeline do projeto! Avise a Direcao Tecnica!", 0 ,0 );
		return false;
	}
	
	Print("ASSETDATA: ");
	Print(assetData);

	var dialog = new initiateUI(selNodes, projectDATA, assetData, utils);
	dialog.ui.show();

///////////////////FUNCOES EXTRAS MAIN///////////////
	function warningAsk(msg){
		var ask = MessageBox.warning(msg, 3, 4);
		return ask == 3;
	}
}


function initiateUI(selectionData, projData, projectAssetData, utils){

	var uiPath = projData.paths.birdoPackage + "ui/BD_SaveASSET.ui";
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	this.projData = projData;
	this.ui.progressBar.hide();
	
	
	//sets the initial prefix digits numberOf
	this.ui.assetIndex.maximum = 999;

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
		
		var namesObj = getAssetList(selectionData.is_animation_lib, assetIndex, projectAssetData, typeFullName);
		
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
		var namesObj = getAssetList(selectionData.is_animation_lib, this.ui.assetIndex.text, projectAssetData, typeFullName);
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

		var prefix = "000".slice(0, 3 - numVal.toString().length);
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
			id : selectionData.is_animation_lib ? "null" : this.ui.groupAsset.labelID.text,
			mcs: selectionData.mcs
		};
		
		var typeFullName = selectionData.is_animation_lib ? Object.keys(projectAssetData)[0] : this.projData.getAssetTypeFullName();
		assetInfo["typeFullName"] = typeFullName;
		
		if(typeFullName == "Misc"){
			assetInfo["prefixo"] = "MI";
			assetInfo["mcs"] = null;
		} else {
			assetInfo["prefixo"] = this.ui.assetIndex.text;
		}
		
		var namesObj = getAssetList(selectionData.is_animation_lib, this.ui.assetIndex.text, projectAssetData, typeFullName);
		assetInfo["assetData"] = selectionData.is_animation_lib ? namesObj.listObj[0] : namesObj.listObj[this.ui.comboAssetName.currentIndex];
		var assetlist = namesObj.listNames;
		assetInfo["assetName"] = assetlist[this.ui.comboAssetName.currentIndex];
		assetlist.shift();
		assetInfo["assetsList"] = assetlist;
		var save_tpl = utils.saveTPL(this, this.projData, assetInfo);//salva o tpl no destino;
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
	function getAssetList(is_anim_lib, assetPrefix, assetData, assetTypeName){//pega as infos do objeto de assets do projeto baseado no prefix atual
		var finalObj = {};
		var nameList = [""];
		var shortNameList = [""];
		var prefix_regex = new RegExp("^([a-zA-Z]\\d{3}}_)", "i");
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
									var shortName = item["short_name"].replace(prefix_regex, "");
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
