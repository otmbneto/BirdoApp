/*
  Function: TB_sceneOpenPreUI_Offline
  Description: function executes when opening an existing offline scene before the UI (views, layouts) have
               been created and loaded.
  Note: This script is also executed when opening a template for editing.
 */ 
include( "TB_RelinkPaths.js" )

/*
  Function: TB_sceneOpenPreUI_Online
  Description: function executes when opening an existing database scene before the UI (views, layouts) have
               been created and loaded.
 */ 
function TB_sceneOpenPreUI_Online(){
}


////MUDAR VERSAO do SCRIPT AQUI:
var create_version = "version 2.1";

///////////////////////

function TB_sceneOpenPreUI_Offline(){
	TB_RelinkPathsInteractive();
  
	var currentPath = scene.currentProjectPath();
	var ui_path = currentPath + "/scripts/createASSET.ui";

	if(isAssetTemplate()){

		var jsonInfo = currentPath + "/_assetCreate.json";
		var lastSaved = "";
		if(fileExists(jsonInfo)){
			lastSaved = readJSON(jsonInfo).originalPath;
			if(!fileExists(lastSaved)){
				lastSaved = "";
			}
		}
		createInterface(ui_path, lastSaved, jsonInfo);

	} else {
		MessageLog.trace("Este SETUP de asset foi criado pelo script 'Create ASSET' da birdo! --- Birdo2021@leobazao");
	}
}

//Complementares//

function isAssetTemplate(){//checa se o arquivo aberto e o ASSET template ou se ja e um arquivo de ASSET
	var sceneName = scene.currentScene();
	var name_regex = /\w{3}_ASSET_template/;
	return name_regex.test(sceneName);
}


function fileExists(path){//checa se arquivo existe
	var file = new File(path);
	return file.exists;
}

function readJSON(json_path){//Le o arquivo JSON e retorna o objeto javascript
	var file = new File(json_path);
		if(!file.exists){
			MessageLog.trace("Convert JSON to Object ERRO: Arquivo dado como parametro nao existe!");
			return false;
		}	
	file.open(FileAccess.ReadOnly);
	var json_object = file.read(json_path);
	file.close();
	return JSON.parse(json_object);
}


function createInterface(ui_path, initialFolder, jsonInfo){//inicia a interface pra escolher o nome do ASSET

	var ui = UiLoader.load(ui_path);
	ui.setMaximumSize(423, 386);//fix windows size

	ui.labelLimit.hide();
	
	var prefixos = ["", "CHAR", "PROP", "FX"];//FIXME:SE precisar adicionar Prefixo, adicione aqui!
	ui.comboBox.addItems(prefixos);
	
	if(initialFolder){
		ui.lineFolder.setText(fileMapper.toNativePath(initialFolder));
	}
	
///CALLBACK FUNCTIONS///
	var updateName = function(){
		var numVal = ui.spinBox.value;
		var prefix = "";
		if(numVal < 10){
			prefix = "000";
		} else if(numVal < 100){
			prefix = "00";
		} else if(numVal < 1000){
			prefix = "0";
		}
		ui.spinBox.prefix = prefix;
		var type = (ui.comboBox.currentText).slice(0,2);
		var number = ui.spinBox.text;
		var name = normalizeName(ui.lineEdit.text);
		if(!name){
			ui.nameLabel.text = "ESCOLHA UM NOME VALIDO!!!";
			return;
		}
		var newName = type + number + "_" + name;
		
		if(ui.spinVersion.value != 0){
			newName += ("_" + ui.spinVersion.text);
		}	
		
		ui.nameLabel.text = newName;
		
		if(newName.length > 23){
			ui.labelLimit.show();
			ui.nameLabel.setStyleSheet("QLabel{\n	color: red;\n	background-color: pink;\n    border: 2px solid white;\n    border-radius: 3px;\n    padding: 2px;\n}");
			ui.createButton.setEnabled(false);
		} else {
			ui.labelLimit.hide();
			ui.nameLabel.setStyleSheet("QLabel{\n	color: darkgreen;\n	background-color: rgb(188, 255, 216);\n    border: 2px solid white;\n    border-radius: 3px;\n    padding: 2px;\n}");
			ui.createButton.setEnabled(true);
		}
	}


	var changeFolder = function(){
		
		var diretorio = FileDialog.getExistingDirectory(initialFolder, "Escolha destino do Arquivo...");
		if(!diretorio){
			MessageLog.trace("diretorio nao escolhido...");
			return;
		} else {
			ui.lineFolder.text = diretorio;
		}	

	}


	var onCreateFile = function(){
		
		if(ui.comboBox.currentText == ""){
			MessageBox.information("Escolha um Tipo!!");
			return;
		}
		
		if(ui.lineEdit.text.length == ""){
			MessageBox.information("Escolha um nome valido para criar o arquivo do Asset!");
			return;
		}
		
		var assetName = ui.nameLabel.text;
		var savePath = ui.lineFolder.text;
				
		if(!savePath){
			MessageBox.information("Escolha um folder valido para salvar o ASSET!");
			return;
		}
		
		var fullName = savePath + "/" + assetName;
		var metadata = {"asset_name" : assetName, "user": about.getUserName() , "originalPath" : savePath, "created" : new Date(), "toon_boom_version" : about.getVersionInfoStr()};

		writeJsonFile(metadata, jsonInfo);//cria o arquivo com info sobre o save (usado pra pegar ultimo caminho salvo)
		
		if(saveFile(fullName)){
			updateSetup(assetName, ui.checkBox.checked);
			scene.clearHistory();//limpa historico de acoes!
			scene.saveAll();//salva alteracoes na cena
			MessageLog.trace(scene.currentVersionName() + " saved...");
			ui.close();
		} else {
			MessageBox.information("Falha ao criar o arquivo!");
		}
		
	}
	
	var onCancel = function(){
		var ask = MessageBox.information("Cancelar fechara este arquivo template sem salvar nenhum arquivo novo!\nDeseja cancelar?", 3, 4);
		if(ask == 3){
			ui.close();
			scene.closeSceneAndExit();//comentar essa linha para editar o template!!!
		}
		return;
	}

////////////////////////////////////

	ui.comboBox["currentIndexChanged(QString)"].connect(updateName);
	ui.spinBox["valueChanged(int)"].connect(updateName);
	ui.spinVersion["valueChanged(int)"].connect(updateName);
	ui.lineEdit.textChanged.connect(updateName);
	ui.button_folder.clicked.connect(changeFolder);
		
	ui.createButton.clicked.connect(onCreateFile);
	ui.cancelButton.clicked.connect(onCancel);
	
	ui.show();
	ui.activateWindow();

////////////////////FUNCOES EXTRAS INTERFACE//////////////
	function saveFile(path){
		
		if(dirExists(path)){
			var ask = MessageLog.trace("Um arquivo com o nome: " + assetName + "\nno destino: " + savePath + "\nDeseja substituir esse arquivo?", 3,4);
			if(ask == 4){
				return false;
			} else {
				if(!removeDirs(path)){
					MessageBox.information("Falha ao sobreescrever arquivo existente!\nCancelando!!");
					return false;
				}
			}
		}

		var save = scene.saveAs(path);
		MessageLog.trace("Asset Criado!" + path);
		return save;
	}


	function dirExists(dirPath){
		var dir = new Dir(dirPath);
		return dir.exists;
	}

	function removeDirs(dirPath){
		var dir = new Dir;
		dir.path = dirPath;
		if(dir.rmdirs()){
			MessageLog.trace("Diretorio removido... " + dirPath);
			return true;
		} else {
			MessageLog.trace("Falha ao remover folder... " + dirPath);
			return false;
		}
	}
	
	function normalizeName(name){//verifica o nome escolhido

		name = name.replace(/(_\d+|_v\d+)$/, "");//remove versao no fim do nome se botarem errado
		var regex = /(\W|_)/;//non caracters
		var arrayName = name.split(regex);
		var finalName = "";
		for(var i=0; i<arrayName.length; i++){//retira caracteres invalidos
			var part = arrayName[i];
			if(regex.test(part)){
				continue;
			}
			var newPart = part[0].toUpperCase() + part.slice(1, part.length);//forca uppercase na primeira letra
			finalName += newPart;
		}
		if(!finalName){
			return name;
		} else {
			return finalName;
		}	
	}
	
	function writeJsonFile(objeto, fileName){//escreve um objeto num aruqivo JSON
		var jsonString = JSON.stringify(objeto, null, 2);
		var file = new File(fileName);
		try {
			file.open(FileAccess.WriteOnly);
			file.write(jsonString);
			file.close();
			MessageLog.trace("JSON File created! " + fileName);
			return true;
		} catch (err){
			MessageBox.warning( "Error while writing Json file:\n" + "File name: " + filename, 1, 0, 0);
		}
		return false;
	}
	
	function updateSetup(assetName, updatePallet){//muda o export e o nome do node (pergunta sobre palette)
		//rename node
		assetName = assetName.replace(/(_\d{2})$/, ""); //retira a versao do nome
		var assetNode = "Top/ASSET_template";
		var columnId = node.linkedColumn(assetNode,"DRAWING.ELEMENT");
		var elementKey = column.getElementIdOfDrawing(columnId);
		node.rename(assetNode, assetName);
		column.rename(columnId, assetName);
		element.renameById(elementKey, assetName);
		//change export
		var exportNodeFull = "Top/SETUP/EXPORT_FULL";
		var exportNodeAlpha = "Top/SETUP/EXPORT_ALPHA";
		var exportPath = "frames/" + assetName;
		node.setTextAttr(exportNodeFull, "DRAWING_NAME", 0, exportPath);
		node.setTextAttr(exportNodeAlpha, "DRAWING_NAME", 0, exportPath + "_A");
		MessageLog.trace("Output Drawing name file seted...");
		if(updatePallet){
			//Create Asset Pallet
			var paletPath = scene.currentProjectPath() + "/palette-library/" + assetName;
			var paletteList = PaletteObjectManager.getScenePaletteList();
			var paleta = paletteList.addPalette(paletPath);
			MessageLog.trace("Palette criada: " + paleta.getName());
			var numCor = paleta.nColors;
			for(var i=numCor-1; i>0; i--){
				var cor = paleta.getColorByIndex(i);
				if(cor.name != "Black"){
					paleta.removeColor(cor.id);
				}
			}
		}
		MessageLog.trace("Update scene OK!");
	}	
	
}
