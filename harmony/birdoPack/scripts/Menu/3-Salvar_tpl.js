include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*v2.0
-------------------------------------------------------------------------------
Name:		2-Salvar_tpl.js

Description:	Script do Birdoapp para salvar itens na library de assets

Usage:		Usado pela supervisao de RIG para salvar o tpl do asset selectionado na nodeView

Author:		Leonardo Bazilio Bentolila

Created:	Julho, 2021. (revisado: fevereiro, 2025)

Copyright:  leobazao_@Birdo
-------------------------------------------------------------------------------
*/

	
function Salvartpl(){
	
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	//checa se a entity e um asset type
	var asset_type = projectDATA.entity.type == "ASSET" ? projectDATA.entity.asset_type : null;
	if(projectDATA.entity.type != "ASSET"){
		MessageBox.warning("Este Arquivo não é um arquivo válido para salvar itens para a Library De Assets!", 0, 0);
		return;
	}
	
	var saveTPL_script = projectDATA["paths"]["birdoPackage"] + "utils/saveTPL.js";
	var utils = require(saveTPL_script);
	var ui_util = require(projectDATA.paths.birdoPackage + "utils/ui_utils.js");

	var selNodes = utils.getSelection(asset_type, projectDATA);// pega nodes selecionados
	if(!selNodes){
		return;
	}
	
	var nodeList = BD2_ListNodesInGroup(selNodes.asset, "", true);//lista todos os nodes se for grupo, se nao retorna somente o read
	if(!utils.checkASSET(selNodes, projectDATA.entity.name, nodeList)){//verifica se esta tudo ok pra gerar o TPL
		MessageLog.trace("[ERROR][SAVETPLBIRDOASSET] Save TPL ASSET Cancelado! Asset nao esta pronto para enviar para Birdo ASSETS!");
		return;
	}
	
	//update mc data info
	selNodes["mcs"] = utils.checkMCnodes(nodeList);
	
	//check rig selected palettes
	var listaPaletaUsadas = require(projectDATA["paths"]["birdoPackage"] + "utils/checkNodesPallet.js").checkNodesPallet(nodeList);//lista as paletas usadas no asset
	if(!utils.checkPallets(listaPaletaUsadas)){
		return;
	}
	
	var assetData = null;
	assetData = utils.getAssetsProjectData(projectDATA);
	if(!assetData){
		MessageBox.warning("ERRO ao pegar as informacoes de Assets da pipeline do projeto! Avise a Direcao Tecnica!", 0 ,0 );
		return false;
	}
	
	Print("ASSETDATA: ");
	Print(assetData);

	var dialog = new initiateUI(selNodes, projectDATA, assetData, utils, ui_util);
	dialog.ui.show();

}


function initiateUI(selectionData, projData, projectAssetData, utils, ui_util){

	var uiPath = projData.paths.birdoPackage + "ui/BD_SaveASSET.ui";
	this.ui = UiLoader.load(uiPath);
	this.ui.activateWindow();
	this.projData = projData;
	this.ui.progressBar.hide();	
	this.selected_data = null;
	this.typeFullName = this.projData.getAssetTypeFullName();
	this.hasAssetData = true;
	
	//set the combo name to editable in cas has no asset lib data
	if(projectAssetData[this.typeFullName].length == 0){
		this.ui.comboAssetName.hide();
		this.hasAssetData = false;
		this.ui.checkShortName.enabled = false;
	} else {
		this.ui.labelAssetName.hide();
	}
	
	
	//sets the initial prefix digits numberOf
	this.ui.assetIndex.maximum = 999;

	/////////////////CALL BACKS
	this.updateAssetInfo = function(){//atualiza as label infos
				
		if(!Boolean(this.ui.comboAssetName.currentText) && this.hasAssetData){
			this.ui.groupAsset.labelName.text = "";
			this.ui.groupAsset.labelID.text = "";
			this.ui.groupAsset.labelType.text = "";
			this.ui.groupAsset.label_shortName.text = "";
			return;
		}
		
		var assetIndex = this.ui.assetIndex.text;
		var namesObj = getAssetList(assetIndex, projectAssetData, this.typeFullName);
		
		//asset name input
		var assetName = this.hasAssetData ? namesObj["listNames"][this.ui.comboAssetName.currentIndex] : this.ui.labelAssetName.text;
		
		var itemObj = projectAssetData[Object.keys(projectAssetData)[0]][0];
		var assetType = this.projData.entity.asset_type;
		
		var assetNameShort = namesObj["listShortNames"][this.ui.comboAssetName.currentIndex];
		this.ui.groupAsset.labelName.text = assetIndex + "_" + assetName;
		this.ui.groupAsset.labelID.text =  this.hasAssetData ? namesObj["listObj"][this.ui.comboAssetName.currentIndex]["id"] : "-";
		this.ui.groupAsset.labelType.text = assetType;
		this.ui.groupAsset.label_shortName.text = Boolean(assetNameShort) ? assetIndex + "_" + assetNameShort : "-";
	}
	
	this.updateName = function(){//atualiza estado dos itens ativados (callback do comboName);
		var assetName = this.hasAssetData ? namesObj["listNames"][this.ui.comboAssetName.currentIndex] : this.ui.labelAssetName.text;
		this.ui.groupRIG.enabled = this.ui.comboAssetName.currentText != "";
		this.ui.saveButton.enabled = Boolean(assetName);
		this.updateAssetInfo();
	}

	this.updateCheckBox = function(){//atualiza o comboboxName (callback do checkBoxShortName)
		this.ui.comboAssetName.clear();

		var namesObj = getAssetList(this.ui.assetIndex.text, projectAssetData, this.typeFullName);
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
		
		var assetType = this.projData.entity.asset_type;
		var numVal = this.ui.assetIndex.value;

		var prefix = "000".slice(0, 3 - numVal.toString().length);
		this.ui.assetIndex.prefix = assetType + prefix;
	
		this.updateCheckBox();
		this.updateAssetInfo();
	}

	this.onSaveTpl = function(){//salva o tpl (callback do saveButton)
		try{
			var test_name = this.hasAssetData ? Boolean(this.ui.comboAssetName.currentText) : Boolean(this.ui.labelAssetName.text);
			if(!test_name){
				MessageBox.warning("Escolha um Nome Valido!", 0, 0);
				return;
			}
			Print(test_name);
			if(!checkSelectionIsStillValid(selectionData)){
				MessageBox.information("Voce deselecionou os nodes inicialmente selecionados! Selecione corretamente de novo!");
				return;
			}
			var assetInfo = {
				pegNode : selectionData.peg,
				assetNode : selectionData.asset,
				fullNode : selectionData.rigFull, 
				version : "v00",
				id : this.ui.groupAsset.labelID.text,
				mcs: selectionData.mcs
			};
			
			assetInfo["typeFullName"] = this.typeFullName;
			if(this.typeFullName == "Misc"){
				assetInfo["prefixo"] = "MI";
				assetInfo["mcs"] = null;
			} else {
				assetInfo["prefixo"] = this.ui.assetIndex.text;
			}
			
			var namesObj = getAssetList(this.ui.assetIndex.text, projectAssetData, this.typeFullName);
			assetInfo["assetData"] = namesObj.listObj[this.ui.comboAssetName.currentIndex];
			var assetlist = namesObj.listNames;
			assetInfo["assetName"] = this.hasAssetData ? assetlist[this.ui.comboAssetName.currentIndex] : this.ui.labelAssetName.text;
			assetlist.shift();
			assetInfo["assetsList"] = assetlist;
			var save_tpl = utils.saveTPL(this, this.projData, assetInfo);//salva o tpl no destino;
			if(!save_tpl){
				Print("Falha ao salvar o tpl do asset no Server! Veja o log para mais informacoes, e avise a Direcao Tecnica!");
			} else {
				Print("Asset Save done!");
			}
			this.ui.close();
		} catch(e){
			Print(e);	
		}
	}

	////////////// CONNECTIONS //////////////////////
	this.ui.checkShortName.toggled.connect(this,this.updateCheckBox);
	this.ui.saveButton.clicked.connect(this, this.onSaveTpl);
	this.ui.cancelButton.clicked.connect(this, this.ui.close);
		
	//connect spin signal
	eval(ui_util.get_connect_string("this.ui.assetIndex", "spin", "this.updateAssetIndex"));
	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.comboAssetName", "combo", "this.updateName"));
	//connect combo signal
	eval(ui_util.get_connect_string("this.ui.labelAssetName", "line_edit", "this.updateName"));

	//MUDAR ITENS DEPOIS DOS CONNECTS
	updateInitialValues(this, selectionData);
	configureRigTypes(this, selectionData);
	
	//força começar com o index 0
	this.updateAssetIndex();
	
	////FUNCOES EXTRAS UI
	function getAssetList(assetPrefix, assetData, assetTypeName){//pega as infos do objeto de assets do projeto baseado no prefix atual
		var finalObj = {};
		var nameList = [""];
		var shortNameList = [""];
		
		if(assetTypeName == "Misc"){
			assetPrefix = "MI";
		}
		
		var objListFiltered = assetData[assetTypeName].filter(function (obj){ return obj["code"].split("_")[0] == assetPrefix});
		objListFiltered.sort(sortObjects);
		objListFiltered.forEach(function (item){ 
									var prefix_name = item["code"].split("_")[0] + "_";
									nameList.push(item["code"].replace(prefix_name, ""));
									var shortName = item["short_name"].replace(prefix_name, "");
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
		if(this.hasAssetData){
			var index = self.ui.comboAssetName.findText(currentAssetName.replace(prefix + "_", ""), "Qt.MatchExactly");
			if(index == -1){
				MessageBox.warning("Este Arquivo nao esta com o um nome de asset reconhecido no sistema do projeto! Escolha um nome da lista e mude o 'Asset Identifier' se necessario!\n\nOBS: SE optar por listar os nomes curtos ('short name'), o script inicialmente sugere o nome do arquivo se este for curto!\n\nIMPORTANTE: Confira no Site do projeto qual o nome correspondente para este asset que esta sendo salvo!!!", 0, 0);
			} else {
				self.ui.comboAssetName.setCurrentIndex(index);
			}
		} else {
			self.ui.comboAssetName.setItemText(0, currentAssetName.replace(prefix + "_", ""));
		}
	}
	
	function configureRigTypes(self, selectionData){
		if(!selectionData.rigFull){
			self.ui.groupRIG.label_full.hide();
			self.ui.groupRIG.nodeFullPath.hide();
			self.ui.groupRIG.label_warningFULL.hide();
		} else {
			self.ui.groupRIG.nodeFullPath.text = selectionData.rigFull;	
		}
		var rigtype = selectionData.rigFull ? "FULL" : "SIMPLE";
		var desc = rigtype == "FULL" ? "(Rig Completo)" : "(Rig simples)";
		self.ui.groupRIG.rig_type_label.text = rigtype;
		self.ui.groupRIG.rig_type_desc_label.text = desc;
	}
	
	function checkSelectionIsStillValid(selObj){
		var currentSelected = selection.selectedNodes();
		return currentSelected.length == 2;
	}
	
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
}
exports.Salvartpl = Salvartpl;
