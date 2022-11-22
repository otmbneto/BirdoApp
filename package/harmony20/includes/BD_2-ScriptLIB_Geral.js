"use strict";
include("BD_1-ScriptLIB_File.js");

/*
-------------------------------------------------------------------------------
Name:		BD_2-ScriptLIB_Geral.js

Description:	Este script armazena a lib de funções gerais mais usadas referentes a nodes, grupos, etc...

Usage:		Usar em outros scripts atraves do include

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2020.
            
Copyright:  leobazao_@Birdo
-------------------------------------------------------------------------------
*/

//#####GLOBAL VARIABLES###

var progressDlg_style = "QLabel {\n	color: white;\n}QProgressBar {\n	color: white;\n padding: 2 2px;\n border: 2px solid white;\n    border-radius: 5px;\n}\n\nQProgressBar::chunk {\n background-color: #05B8CC;\n width: 20px;\n}\nQPushButton {\nborder: 2px solid white;\n border-radius: 6px;\n background-color: ligthgray;\n width: 110px;\n height: 23px;\n}QPushButton:pressed {\n color: black;\n background-color: #05B8CC;\n}\n\nQPushButton:flat {\n border: none; \n}\nQWidget{\n background-color: gray;\n}";
var BD2_all_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"


//################OBJETOS#########################//
/*print no log, no System terminal - recebe string ou Obj
@obj => objeto para ser printado
*/
function Print(msg){
	if(typeof msg == "object"){
		var msg = JSON.stringify(msg, null, 2);
	}
	MessageLog.trace(msg);
	System.println(msg);
}

/*cria um objeto com os valores e keys passados OBS> os dois parametros tem que ter o mesmo tamanho
@keyList => array de keys do objeto
@valList => array cos valores na ordem da array de keys
*/
function BD2_CriaObjeto(keyList, valList){
	if(keyList.length != valList.length){
		MessageBox.information("Funcao CriaObjeto: Parametros invalidos! Ambas listas devem conter o mesmo numero de itens!!");
		return false;
	}	
	var obj = {};
	for(var i=0; i<keyList.length; i++){
		obj[keyList[i]] = valList[i];
	}
	return obj;
}

/*Merge two obj and return one
@a => object A
@b => object B
*/
function BD2_mergeObjects(a,b){
	for(var key in b){
		if(key in a){
			if(BD2_isArray(a[key]) && BD2_isArray(b[key])){								
				a[key] = BD2_remove_copies(a[key].concat(b[key]));
			}
			else if(BD2_isObj(a[key]) && BD2_isObj(b[key])){
				a[key] = BD2_mergeObjects(a[key],b[key]);
			}
			else if(typeof a[key] === typeof b[key]){	
				a[key] = b[key];
			}
			else{
				continue;
			}			
		}
		else{
			a[key]= b[key];
		}
	}
	return a;
}


/*remove copies from the list
@a => object 
*/
function BD2_remove_copies(a) {

	var primitives = {"boolean":{}, "number":{}, "string":{}}
	var objs = [];

	var foo = function(item) {
		var type = typeof item;
		if(type in primitives){
			return primitives[type].hasOwnProperty(item) ? false : (primitives[type][item] = true);
		}else{
			return objs.indexOf(item) >= 0 ? false : objs.push(item);
		}
    };
	return a.filter(foo);
}

/*return true if it is an object
@obj => object 
*/
function BD2_isObj(obj){

	return obj.constructor === Object;

}

/*return true if it is an object array
@obj => object 
*/
function BD2_isArray(obj){

	return Object.prototype.toString.call(obj) === "[object Array]";

}

//#################COLUMN#############################//
/*Lista Todos os drawings do node SELECIONADO na mesma ordem da library de desenhos
*/
function BD2_getTimingsOfSelected(selected){
		
	if(node.type(selected) != "READ"){
		MessageLog.trace("Falha ao listar timings! Node selecionado nao e READ!");
		return false;
	}
	
	var coluna = node.linkedColumn(selected, "DRAWING.ELEMENT");
	var timings = column.getDrawingTimings(coluna);
	
	timings.sort(function(a, b) {
			if(a[0] == b[0]){
 				return a.length - b.length;
			}
		});

	return timings;
}

//#################NODES #############################//
/*Lista todos os nodes dentro do grupo dado, usa filtros par ao tipo
@firstGroup => grupo inicial para listar os nodes dentro
@typeList => array com tipos de nodes a ser listados ("" vazio para nao filtrar e retornar TODOS nodes)
@fullpath => boolean se retorna o full path dos nodes, ou retira o caminho do grupo inicial 
*/
function BD2_ListNodesInGroup(firstGroup, typeList, fullpath){
	var useTypeFilter = true;

	if(!typeList){
		useTypeFilter = false;
	}

	if(node.type(firstGroup) != "GROUP"){//se nao for um grupo no parametro, retorna ele num array	
		if(typeList.indexOf(node.type(firstGroup)) == -1){
			Print("[LISTNODESINGROUP]: Node nao valido! Retornando lista vazia!");
			return [];
		} else {
			return [firstGroup];
		}
	}

	var finalList = [];

	var subNodes = node.subNodes(firstGroup);
	listaRecursiva(subNodes);

	function listaRecursiva(nodeList){
		for(var i=0; i<nodeList.length; i++){
			var tipo = node.type(nodeList[i]);
		
			if(fullpath){//verifica se quer o caminho inteiro
				var item = nodeList[i];
			} else {
				var item = nodeList[i].replace(firstGroup + "/", "");
			}
			
			if(!useTypeFilter){
				finalList.push(item);
			} 
			else if(typeList.indexOf(tipo) != -1){
				finalList.push(item);
			}
			if(tipo == "GROUP"){
				listaRecursiva(node.subNodes(nodeList[i]));
			}
		}	
	}
	return finalList;
}

/*Lista todos os nodes dos tipos listados, recursirvamente dentro da selecao de nodes
@selNodes => selection.selectedNodes();
@typelist => array com tipos de nodes a ser listados ("" vazio para nao filtrar e retornar TODOS nodes)
*/
function BD2_ListNodesInSelection(selNodes, typelist){
	
	var finalList = [];

	for(var i=0; i<selNodes.length; i++){
		var type = node.type(selNodes[i]);

		if(typelist && typelist.indexOf(type) == -1){
			continue;
		}

		finalList.push(selNodes[i]);
		if(node.isGroup(selNodes[i])){
			var newList = finalList.concat(BD2_ListNodesInGroup(selNodes[i], typelist, true));
			finalList = newList;
		}
	}
	return finalList;
}


/*Lista todos os nodes dos tipos listados, conectados acima do node inicial
@initialNode => node inicial para procurar os nodes conectados acima
@typeArray => array com tipos de nodes a ser listados ("" vazio para nao filtrar e retornar TODOS nodes)
@exception => string com excecoes nos nomes de nodes q NAO devem ser listados
*/
function BD2_ListNodesUp(initialNode, typeArray, exception){
	var nodeList = [];

	if(node.getName(initialNode) == ""){
		MessageLog.trace("Falha Ao encontrar a comp Inicial");
		return false;
	}
	
	listConnectedNodes(initialNode);

	function listConnectedNodes(rootNode){
		var connections = node.numberOfInputPorts(rootNode);
		if(connections >0){
			for(var i=0; i<connections; i++){
			var nodeConnected = node.srcNode(rootNode,i);
				if(typeArray.indexOf(node.type(nodeConnected)) != -1 && nodeConnected != ""){
					if(!exception){
						nodeList.push(nodeConnected);
					} else if(node.getName(nodeConnected).indexOf(exception) == -1){
						nodeList.push(nodeConnected);
					}
				}
				listConnectedNodes(nodeConnected);
			}
		}
	}
	return nodeList;
}

/*Lista todos os nodes dos tipos listados, conectados ABAIXO do node inicial
@initialNode => node inicial para procurar os nodes conectados abaixo
@typeArray => array com tipos de nodes a ser listados ("" vazio para nao filtrar e retornar TODOS nodes)
@exception => string com excecoes nos nomes de nodes q NAO devem ser listados
*/
function BD2_ListNodesDown(initialNode, typeArray, exception){
	var nodeList = [];
	if(node.getName(initialNode) == ""){
		MessageLog.trace("[LISTNODESDOWN] Invalid node!");
		return false;
	}
	listConnectedNodes(initialNode);

	function listConnectedNodes(rootNode){
		var outPorts = node.numberOfOutputPorts(rootNode);
		if(outPorts >0){
			for(var i=0; i<outPorts; i++){
				if(!node.isLinked(rootNode, i)){
					continue;
				}
				list_links(rootNode, i);
			}
		}
	}
	function list_links(nodePath, port){
		var links = node.numberOfOutputLinks(nodePath, port);
		for(var y=0; y<links; y++){
			var nodeConnectedInfo = node.dstNodeInfo(nodePath, port, y);
			if(typeArray.indexOf(node.type(nodeConnectedInfo.node)) != -1){
				if(!exception){
					nodeList.push(nodeConnectedInfo.node);
				} else if (node.getName(nodeConnectedInfo.node).indexOf(exception) == -1){
					nodeList.push(nodeConnectedInfo.node);
				}
			}
			if(node.type(nodeConnectedInfo.node) == "MULTIPORT_OUT"){
				var parentGroup = node.parentNode(nodeConnectedInfo.node);
				list_links(parentGroup, nodeConnectedInfo.port);
			} else if (node.isGroup(nodeConnectedInfo.node)){
				var portIn = [nodeConnectedInfo.node, "Multi-Port-In"].join("/");
				list_links(portIn, nodeConnectedInfo.port);
			} else {
				listConnectedNodes(nodeConnectedInfo.node);
			}
		}
	}
	return nodeList;
}

/*Funcao q copia os att de um node para o outro no frame atual//
@node1 => node para copiar os atributos
@node2 => node para colar os atributos
*/
function BD2_copyAtributes(node1, node2, only_columns){
	var a = frame.current();
	var counter = 0;

	if(node.type(node1) != node.type(node2)){
		Print("[COPYATTRIBUTES] ERROR: different node types: " + node1 + " : " + node2);
		return false;
	}

	if(node.type(node1) == "READ"){//se for drawing, copia exposicao
		var col_1 = node.linkedColumn(node1,"DRAWING.ELEMENT");
		var col_2 = node.linkedColumn(node2,"DRAWING.ELEMENT");
		if(col_1 != "" && col_2 != ""){
			var exp1 = column.getEntry(col_1, 1, a);
			column.setEntry(col_2, 1, a, exp1);
		};
	};

	var myList = node.getAttrList(node1, a);

	myList.forEach(function (x){

		var col = null;
		var fullAttName = null;

		if(x.hasSubAttributes()){
			var subAtt = x.getSubAttributes();
			subAtt.forEach(function (y){
				fullAttName =  y.fullKeyword();
				col = node.linkedColumn(node1, fullAttName);
				if(!col && only_columns){
					return;
				}
				var attrVal = y.textValue();
				node.setTextAttr(node2, fullAttName, a, attrVal);
				counter++;	
			});
		} else {
			fullAttName = x.fullKeyword();
			col = node.linkedColumn(node1, fullAttName);
			if(!col && only_columns){
				return;
			}
			var attrVal = x.textValue();
			node.setTextAttr(node2, fullAttName, a, attrVal);
			counter++;
		}
	});
	Print("[COPYATT]: " + node1 + " to " + node2);
	Print(" -- att copied " + counter);
}

/*Adiciona um node embaixo ao node selecionado 
@nodeSel => selected Node
@nodeName => new node name
@type => node type like "BLUR".. "WRITE"...
@end_connection => if its a end type node like Display or Write (bool)
*/
function BD2_AddNodeUnder(nodeSel, nodeName,  type, end_connection){

	var parentGroup = node.parentNode(nodeSel);
	var x = node.coordX(nodeSel);
	var y = node.coordY(nodeSel);
	var newY = y + 80;
	var newX;

	if(end_connection){
		newX = x + 50;
	} else {
		newX = x;
	}

	var nodePort = node.numberOfOutputPorts(nodeSel) -1;
	
	var newNode = node.add(parentGroup, nodeName, type, newX, newY, 0);

	if(!end_connection){
		var compPort = node.dstNodeInfo(nodeSel, nodePort, 0).port;
		var comp = node.dstNode(nodeSel, nodePort, 0);
		node.unlink(comp, compPort);
		node.link(newNode, 0, comp, compPort);
	}

	node.link(nodeSel, nodePort, newNode, 0);
	return newNode;
}

/*Adiciona um node acima ao node selecionado 
@nodeSel => selected Node
@nodeName => new node name
@type => node type like "BLUR".. "WRITE"...
@end_connection => se nao houver mais nodes acima do node selecionado
*/
function BD2_AddNodeUp(nodeSel, nodeName,  type, end_connection){

	var parentGroup = node.parentNode(nodeSel);
	var x = node.coordX(nodeSel);
	var y = node.coordY(nodeSel);
	var newY = y - 70;
	var newX = x;
	
	var newNode = node.add(parentGroup, nodeName, type, newX, newY, 0);

	if(!end_connection){
		var up_node = node.srcNode(nodeSel, 0);
		node.unlink(nodeSel, 0);
		node.link(newNode, 0, nodeSel, 0);
	}
	node.link(up_node, 0, newNode, 0);
	return newNode;
}

/*Relinka drawings depois de renomeados e retorna o path do TransformationSwitch atualizado
@initial_node => drawing Node
@obj_name => objeto onde os KEYS sao os old_names e os VALUES sao os new_names
*/	
function BD2_RelinkDrawingDeformation(initial_node, obj_name){
	var changed = false;
	var nextNode = node.srcNode(initial_node, 0);
	while (nextNode != ""){
		if(node.type(nextNode) == "TransformationSwitch"){
			break;
		}
		if(node.isGroup(nextNode)){
			nextNode += "/Multi-Port-Out";
		}
		nextNode = node.srcNode(nextNode, 0);
	}

	if(nextNode != ""){
		var transwitch = nextNode;
	} else {
		//MessageLog.trace("O Drawing : " + initial_node + " nao contem deformationChain!");
		return false;
	}

	var deformations = listTransformations(transwitch);
	for(var i=0; i<deformations.length; i++){
		var trans = "TransformationNames.transformation" + deformations[i];
		var drawings_def = node.getTextAttr(transwitch, 1, trans);
		var renameDefs = drawings_def;
		for(item in obj_name){//troca os nomes no paramentro d
			renameDefs = renameDefs.replace(item + ";", obj_name[item] + ";");
		}
		if(renameDefs != drawings_def){
			node.setTextAttr(transwitch, trans, 1, renameDefs);
			changed = true;	
		}
	}

	if(changed){			
		return transwitch;
	} else {
		return false;	
	}

	function listTransformations(trans_switch){
		var transformations = [];
		var connections = node.numberOfInputPorts(trans_switch);
		if(connections >0){
			for(var i=0; i<connections; i++){
				var trans = node.srcNode(trans_switch, i);
				if(node.isGroup(trans)){
					transformations.push(node.getName(trans));
				}
			}
		}
		return transformations;
	}
}

//################# MATRIX #############################//
/*calcula a media de scale para lista de nodes
@drawingsNodesList => lista de nodes paara calcular a media da matrix de SCALE
@atFrame => frame para calcular
*/
function BD2_getMedianScaleForNodes(drawingsNodesList, atFrame){
	var numOfNodes = drawingsNodesList.length;
	var sumNodeMatrixScale = 0;
	for(var i=0; i<numOfNodes; i++){
		var nodeScaleMat = node.getMatrix(drawingsNodesList[i], atFrame).extractScale();
		var nodeScaleXY = (nodeScaleMat.y + nodeScaleMat.x)/2;//media entre a scala X e Y
		//MessageLog.trace("node: " + drawingsNodesList[i] + " : " +  nodeScaleXY);
		if(!isNaN(nodeScaleXY)){
			sumNodeMatrixScale += nodeScaleXY;
		}
	}
	if(sumNodeMatrixScale == 0){
		MessageLog.trace("erro ao definir o numero da linha!");
		return false;
	}
	var mediaNodes = (sumNodeMatrixScale/numOfNodes).toFixed(1);
	return parseFloat(mediaNodes);
}
	
/*Retorna o fator de enquadramento da camera (matrixZ/matrixScala) 
@drawingsNodesList => lista de nodes paara calcular a media da matrix de SCALE
@atFrame => frame para calcular
*/
function BD2_getCameraFrameValue(atFrame){
	var cm = scene.getCameraMatrix(atFrame);
	var cameraZfactor = scene.numberOfUnitsZ()/scene.fromOGLZ(cm.origin().z);
	var camScaleMat = cm.extractScale();
	var camScaleXY = (camScaleMat.y + camScaleMat.x)/2;
	return parseFloat((camScaleXY * cameraZfactor).toFixed(2));
}


//################BATCH#########################//
/*Roda o script dado na cena dada
@tbFile => caminho do arquivo para rodar os scritp (com versao .xstage)
@scriptName => nome do script para ser rodado
*/
function BD2_CompileScript(tbFile, scriptName){
	if(scriptName.indexOf("/") != -1){
		var scriptPath = scriptName;
	} else {
		var scriptPath = specialFolders.userScripts + "/" + scriptName;
	}
	var command = specialFolders.bin + "/HarmonyPremium.exe";
	commandArguments = [];
	commandArguments.push(command);
	commandArguments.push(tbFile);
	commandArguments.push("-batch");
	commandArguments.push("-compile");
	commandArguments.push(scriptPath);
	try {
		Process.execute(commandArguments);
	} catch (err){
		MessageBox.warning( "Error while running Script: " + scriptPath, 1, 0, 0);
		return false;
	}
	MessageLog.trace("Script: " + scriptName + " rodado com sucesso no arquivo: " + tbFile);
	return true;
}

/*pega a ultima versao da cena e retorna o caminho inteiro
@scenePath => caminho da cena
*/
function BD2_GetLastSceneVersion(scenePath){
	var myDir = new Dir();
	myDir.path = scenePath;
	var fileList = myDir.entryList("*.xstage",2,1);
	if(fileList == ""){
		return false;
	}
	return myDir.filePath(fileList[0]);
}

/*Pega os caminhos do projeto (locais e rede) e retorna objeto
*/
function BD2_ProjectInfo(){
	
	var birdoPackage = BD2_updateUserNameInPath(specialFolders.userScripts) + "/packages/BirdoPack/";
	var pathsScript = birdoPackage + "/utils/birdoPaths.js";
	
	if(!BD1_FileExists(pathsScript)){
		Print("[ERROR] Script 'birdoPaths.js' nao encontrado! Nao sera possivel pegar informacoes do projeto!");
		return false;
	}
	
	var projectDATA = require(pathsScript).birdoPaths();
	
	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	projectDATA["paths"]["birdoPackage"] = birdoPackage;

	return projectDATA;
	
}


/*Retorna uma substring ate o padrao regex passado como parametro
@string => string a ser analisada
@regex => padrao de string para procurar (regular expression)
*/
function BD2_substringRegex(string, regex){
	if(!regex.test(string)){
		return false;
	}
	var matchs =  regex.exec(string);
	return string.substring(0, (matchs.index + matchs[0].length));
}


/*Retorna um objeto contendo informacoes sobre o rig baseado na selecao
@selectedNode => node selecioado
*/
function BD2_get_Rig_Data(selectedNode){

	var rig_data = {};
	var version_regex = /(v\d+)/; // versao do rig  'v01'
	var rig_name_regex = /(CH(\d{3}|\d{4})_\w+)/; // padrao nome do rig completo 'CH000_NOME'
	var rig_simp_regex = /(CH\d{3}_\w+_v\d+)/; // padrao nome do rig simples CH000_NOME_v00
	var index_regex = /(_\d+)/; //numero de nodes duplicados na nodeview '_1, 2, 3 ...'
	var rig_type = null;
	var regex;// variavel q vai ser definida conforme o SIMPLES ou COMPLETO

	if(!rig_name_regex.test(selectedNode)){
		MessageBox.information("Nao e um RIG de personagem!!");
		return false;
	}

	if(rig_simp_regex.test(selectedNode)){
		rig_type = "SIMPLES";
	} else {
		rig_type = "COMPLETO";
	}

	if(rig_type == "COMPLETO"){
		regex = /(\w{3}\.\w+-v\d+)/; // padrao nome do grupo versao do RIG : prj.NOME-v00
		if(!regex.test(selectedNode)){
			MessageBox.information("O Rig esta desatualizado! Avise o Leo!");
			return false;
		}
	} else if(rig_type == "SIMPLES"){
		regex = rig_name_regex;
	}

	var nodeName = rig_name_regex.exec(selectedNode)[0].replace(index_regex, "");
	nodeName = nodeName.replace(/(_v\d+)/, "");//limpa versao
	rig_data["version"] = version_regex.exec(selectedNode)[0];
	rig_data["name"] = nodeName;

	var buffer = selectedNode.split("/");
	var path = "";
	for(var i=0; i<buffer.length; i++){
		path += buffer[i];
		if(regex.test(buffer[i])){
			rig_data["fullPath"] = path;
			break;
		}
		path += "/";
	}
	rig_data["selection_name"] = node.getName(selectedNode);
	rig_data["selection_path"] = selectedNode;
	rig_data["type"] = rig_type;
	return rig_data;
}


/*
Cria uma janela de aviso e retorna o resultado da escolha do usuario.
*/
function BD2_warnUser(msg,title,yes_text,no_text){

  	var sampleDialog = new Dialog();
  	sampleDialog.title = title;
 	var bodyText = new Label();
  	bodyText.text = msg;
  	sampleDialog.add( bodyText );
  	sampleDialog.addSpace( 15 );

  	sampleDialog.okButtonText = yes_text;
  	sampleDialog.cancelButtonText = no_text;
  	var result = sampleDialog.exec();

	return result;
}


/*
formata uma string com zeros a esquerda e.g 01,001,0001,etc...
*/
function BD2_zerosFill(number, zeros){
	var dig = zeros.length * -1;
	zeros += number.toString();
	return zeros.slice(dig);
}

/*
Checa se o nome da cena tem padrao de cena!
@cena > nome da cena pra checar
*/
function BD2_check_padrao_scene(cena){
	var scene_regex = /(\w{3}_\d{3}_(sc|SC)\d+)$/;// captura substrings com o formato parecido com njn_666_sc0080.
	
	if(!scene_regex.test(cena)){
		MessageBox.information("O nome desta cena não está no padrão.\nAvise o Leo!");
		return false;
	}
	
	return true;
}


/*
retorna obj com info sobre as palettas da cena
@useProgressBar > boolean que determina se sera usada progress bar 
*/
function BD2_getPalettes(useProgressBar){

	var curPaletteList = PaletteObjectManager.getScenePaletteList();
	var palettesObj = {}; 

	for(var i=0; i< curPaletteList.numPalettes; i++){
		var palette = curPaletteList.getPaletteByIndex(i);
		var name = palette.getName();
		var fullpath = palette.getPath() + "/" +  name + ".plt";
		var id = palette.id;
		palettesObj[id] = {"id": id, "isUsed" : false, "fullpath" : fullpath, "name" : name, "location" : palette.location};
	}

	if(useProgressBar){
		var progressDlg; 
		progressDlg = new QProgressDialog();
		progressDlg.modal = true;
		progressDlg.open();
		progressDlg.setRange(0, (element.numberOf() -1));
	}

	for(var i=0; i<element.numberOf(); i++){
		var ElementId = element.id(i);
		var elementPaletteList = PaletteObjectManager.getPaletteListByElementId(ElementId);
		if(useProgressBar){
			progressDlg.setLabelText("Analizando Palette..." + element.getNameById(ElementId));
			progressDlg.setValue(i);
		}
		for(var j=0; j<Drawing.numberOf(ElementId); j++){
			var drawingId = Drawing.name(ElementId,j);
			var colorArray = DrawingTools.getDrawingUsedColors({elementId : ElementId, exposure : drawingId});
			for(var colorIndex = 0; colorIndex < colorArray.length; colorIndex++){
				var palettID = elementPaletteList.findPaletteOfColor(colorArray[colorIndex]).id;
					
				if(palettID in palettesObj && !palettesObj[palettID]["isUsed"]){
					palettesObj[palettID]["isUsed"] = true;

				}
			}
		}
	}
	if(useProgressBar){
		progressDlg.hide();
	}
	return palettesObj;
}


/*
renomeia todos os drawings que tem numero como nome para um prefixo com um numero unico (usado em uma selecao na timeline
@prefixo > prefixo para o novo nome dos drawings
@useRandom > boolean que determina se sera usado numeros randomicos para o novo nome
*/
function BD2_RenameDrawingsWithNumber(prefixo, useRandom){

	var numSelLayers = Timeline.numLayerSel;
	var number = 1;
	var counter = 0;
	var progressDlg = new QProgressDialog();
	progressDlg.modal = true;
	progressDlg.open();
	progressDlg.setRange(0, (numSelLayers - 1));
	progressDlg.setLabelText("Analizando... ");

	for(var i=0; i<numSelLayers; i++){
		progressDlg.setValue(i);

		if(progressDlg.wasCanceled){
			MessageBox.information("Cancelado!");
			return;
		}
	
		if(useRandom){
			number = Math.floor(Math.random() * 10000);
		}

		if(Timeline.selIsNode(i)){
			var node_path = Timeline.selToNode(i);
		}

		progressDlg.setLabelText("Analizando... " + node.getName(node_path));
		progressDlg.setValue(i);

		if(node.type(node_path) == "READ"){
			
			counter += renameDrawing(node_path, prefixo, number);
			
		}
	}

	progressDlg.hide();

	return counter;

	/////////////////////////Funcao EXTRA//////////////////////////////////////
	function renameDrawing(drawing_node, prefixo, numero){//renomeia o drawing sem nome ainda, e relinka os deforms. Retorna counter
		var count = 0;
		var renames = {};
		var firstFrame = Timeline.firstFrameSel;
		var endFrame = firstFrame + Timeline.numFrameSel - 1;
		var new_name = null;
		var rename = false;
		var coluna = node.linkedColumn(drawing_node,"DRAWING.ELEMENT");

		for(var i = firstFrame; i<= endFrame; i++){
		
			var current_drawing = column.getEntry(coluna, 1, i);
			if(!isNaN(current_drawing[0])){
				count++;
				while (!rename){
					new_name = prefixo + numero;
					rename = column.renameDrawing(coluna, current_drawing, new_name);
					if(rename){
						renames[current_drawing] = new_name;
						MessageLog.trace("O node " + node.getName(drawing_node) + " teve o desenho : " + current_drawing + " renomeado para : " + new_name);
					}
					numero++;
				}
			}

		}

		var deform = BD2_RelinkDrawingDeformation(drawing_node, renames);

		if(rename && deform != false){
			MessageLog.trace("Deform switch atualizado: " + deform);
		}

		return count;
	}
	
}


/*
gera thumbnails para o tpl dado como parametro
@tpl > path do tpl para gerar os thumbs (obs: nao precisa do .xstage)
*/
function BD2_createThumbnails(tpl){

	var command = specialFolders.bin + "/HarmonyPremium.exe";
	var commandArguments = [command,"-batch","-template",tpl,"-thumbnails","-readonly"];

	var ret = Process.execute(commandArguments);
	
	if(ret == 0){
		MessageLog.trace("Thumbnails do template " + tpl + " foram criados com sucesso!");
	} else {
		Print("erro ao gerar os thumbnails de: " + 	tpl);
		return false;
	}
	return tpl + "/.thumbnails";
}

/*
renomeia o node dado para o nome dado. Se for READ renomeia a column do drawing tmb
@node_path > full path do node a ser renomeado
@new_name > novo nome para o node
*/
function BD2_renameNode(node_path, new_name){
	if(node.getName(node_path) == new_name){
		Print("Nao e necessario renomear o node pois o nome ja esta correto!");
		return node_path;
	} else {
		var renamed_fullname = node.parentNode(node_path) + "/" + new_name;
	}
	if(node.type(node_path) == "READ"){
		var columnId = node.linkedColumn(node_path, "DRAWING.ELEMENT");
		var elementKey = column.getElementIdOfDrawing(columnId);
		if(node.rename(node_path, new_name)){
			column.rename(columnId, new_name);
			element.renameById(elementKey, new_name);
			MessageLog.trace("Node: '" + node_path + "'  renomeado para: " + new_name);
			return renamed_fullname;
		} else {
			MessageLog.trace("Falha ao renomear o node: '" + node_path + "' para o nome: " + new_name);
			return false;
		}
	} else {
		if(node.rename(node_path, new_name)){
			MessageLog.trace("Node: '" + node_path + "'  renomeado para: " + new_name);
			return renamed_fullname;
		} else {
			MessageLog.trace("Falha ao renomear o node: '" + node_path + "' para o nome: " + new_name);
			return false;
		}
	}
}


/*
retorna um objeto com as coordenadas na nodeView (X, Y, Z, width, Heigth);
@node_path > node path do node a ser analizado
*/
function BD2_get_node_coord(node_path){

	var coord_obj = {};
	coord_obj["x"] = node.coordX(node_path);
	coord_obj["y"] = node.coordY(node_path);
	coord_obj["z"] = node.coordZ(node_path);
	coord_obj["w"] = node.width(node_path);
	coord_obj["h"] = node.height(node_path);

	return coord_obj;
}


/*
@olg > true or false para ver a olg
@render > true or false para ver o render
acerta os visibilitys dos bgs da cena (somente funciona em um shot ou cena);
*/
function BD2_FixBgVisibility(olg, render){
	
	var bgComp = "Top/BG";
	
	if(node.getName(bgComp) == ""){
		MessageLog.trace("Bg comp nao encontrada!");
		return false;		
	}

	var grupos = BD2_ListNodesUp(bgComp, ["GROUP"]);
	var visibList = [];
	
	for(var i=0; i<grupos.length; i++){
		var visi = BD2_ListNodesInGroup(grupos[i], "VISIBILITY", true);
		visibList.push(visi);
	}
	
	for(var i=0; i< visibList.length; i++){
		node.setTextAttr(visibList[i],"OGLRENDER", 1, olg);
		node.setTextAttr(visibList[i],"SOFTRENDER", 1, render);
	}
	MessageLog.trace(visibList.length + " visibility nodes foram corrigidos!");
	return visibList;
}

/*
procura por cores com ids clonados nas paletas;
*/

function BD2_checkColours(){

	var curPaletteList = PaletteObjectManager.getScenePaletteList();
	var colours = {}; 
	var message = "Conflito de Cores:\n";

	for(var i=0; i< curPaletteList.numPalettes; i++){
		var palette = curPaletteList.getPaletteByIndex(i);
		var paletteName = palette.getName();
		for(var j=0; j < palette.nColors; j++){
			var colourId = palette.getColorByIndex(j).id;
			var colourName = palette.getColorByIndex(j).name;
			if(colourId in colours){
				message += ("- ID: " + colourId + ":\n");
				message += ("   > " +  colours[colourId].palette + ">>" + colours[colourId].name + ";\n");
				message += ("   > " +  paletteName + ">>" + colourName + ";\n\n");
				continue;
			}
			colours[colourId] = {};
			colours[colourId]["palette"] = paletteName;
			colours[colourId]["name"] = colourName;

		}
	}

	if(message != "Conflito de Cores:\n"){
		MessageBox.information(message);
		MessageLog.trace(message);

		return false;
	} else {
		MessageLog.trace("Cores OK!");
		return true;
	}
}

/*
corrig o number of units pra 24 24 12;
*/
function BD2_SceneNumberOfUnits(){
	var nou_24 = {"x" : 24, "y" : 24, "z" : 12};
	var change = scene.setNumberOfUnits(nou_24.x, nou_24.y, nou_24.z);
	if(!change){
		MessageLog.trace("nao foi preciso mudar o Scene Number Of Units..");
		return false;
	} else {
		MessageLog.trace("Scene Number Of Units updated to 24 24 12...");
		return true;
	}
}

function BD2_DeleteUnusedWrites(){//limpa write nodes da cena q nao estao conectados pra evitar travar
	var writes = node.getNodes(["WRITE"]);
	for(var i=0; i<writes.length;i++){
		if(!node.isLinked(writes[i], 0)){
			var deln = node.deleteNode(writes[i], true, true);
			MessageLog.trace("unconnected Write node deleted! " + writes[i] + " : deleted => " + deln);
		}	
	}	
}
	
/*
funciona como o replace mas para todos os matches na string
@string => string a ser modificada;
@find => String para ser renomeada na string;
@replace => String nova a ser trocada;
*/
function BD2_RenameAll(string, find, rename){//replace all matchs 
	var finalName = string;
	while(true){
		finalName = finalName.replace(find, rename);
		if(finalName.indexOf(find) == -1){
			break;
		}
	}
	return finalName;
}

/*
Inicia a ui do loading pelo python, retorna o processo... (OBG tem q chamar processo.terminate() para encerrar e process.isAlive() para testar se ainda esta rodando)
@birdoAppPath => caminho do app birdo no sistema;
@timeout => tempo de duracao do loading;
@text => String com a descricao do loading;
*/
function BD2_loadingBirdo(birdoAppPath, timeout, loadingtext){
	var pythonPath = BD2_FormatPathOS(birdoAppPath + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(birdoAppPath + "app/utils/loadingDialog.py");
	var start = Process2(pythonPath, pyFile, timeout, loadingtext);
	var ret = start.launchAndDetach();

	if(ret != 0){
		Print("Fail to start progressBirdo progress!");
		return false; 
	}
	
	return start;
}


//encript pw
function BD2_enc_string(string){
	var enc = "";
	var mult = string.length;
	for(var i=0; i<string.length; i++){
		var curr_i = BD2_all_chars.indexOf(string[i]);
		var new_i = curr_i - (mult*2);
		while(new_i < 0){
			new_i += BD2_all_chars.length;
		}
		enc += BD2_all_chars[new_i];
		mult--;
	}
	return enc;
}
//decript pw
function BD2_dec_string(string){
	var dec = "";
	var mult = string.length;
	for(var i=0; i<string.length; i++){
		var curr_i = BD2_all_chars.indexOf(string[i]);
		var new_i = curr_i + (mult*2);
		while(new_i >= BD2_all_chars.length){
			new_i -= BD2_all_chars.length;
		}
		dec += BD2_all_chars[new_i];
		mult--;
	}
	return dec;
}


/*
Upload de arquivos e pastas para o server do nextcloud do projeto 
@birdoAppAPth = path do birdoapp
@file_or_dir = 'file' or 'dir' arquivo ou folder para subir pra rede
@server_path
*/
function BD2_UploadToNextcloud(birdoAppPath, file_or_dir, server_path, local_path){
	var pythonPath = birdoAppPath + "venv/Scripts/python";
	var pyFile = BD2_RenameAll(birdoAppPath + "app/utils/nextcloud_upload_" + file_or_dir + ".py", "/", "\\\\");
	var tempfolder = specialFolders.temp + "/BirdoApp/";

	if(!BD1_DirExist(tempfolder)){
		BD1_createDirectoryREDE(tempfolder);
	}

	var output_json = tempfolder + "uploadNextcloud_" + new Date().getTime() + ".json";
	var start = Process2(pythonPath, pyFile, server_path, local_path, output_json);
	var ret = start.launch();
		
	if(ret != 0){
		Print("Fail to start progressBirdo progress!");
		return false; 
	}

	return BD1_ReadJSONFile(output_json);
}

/*
	Formata o caminho pro OS usado
	@path => caminho a ser mudado
*/
function BD2_FormatPathOS(path){
	var finalPath = null;
	var nativePath = fileMapper.toNativePath(path);
	if(about.isMacArch()){//define caminhos no Mac
		finalPath = BD2_RenameAll(nativePath, "\\", "/");
	} else if(about.isWindowsArch()){//define caminhos no Windows
		finalPath = nativePath;		
	} 

	return finalPath;
}

/*
	Renomeia o nome de usuario no path se tiver caracter invalido para caminhos (usar em todos caminhos possiveis!)
	@dirPath => caminho a ser mudado
*/
function BD2_updateUserNameInPath(dirPath){
	var regex = /([^\u0000-\u007F]+|\s)/;//ASCII characters (non english chars)
	var systemUser = dirPath.split(/\/|\\/)[2];//pega o 3 nome no path contando q seja o user
	if(!regex.test(systemUser)){
		Print("Caminho: " + dirPath + " nao contem o usuario no nome! Nao e necessario mudar path!");
		return dirPath;
	}

	if(about.isWindowsArch()){//If is windows check OS user name
		if(regex.test(systemUser)){
			var shortPathJson = "C:/_BirdoRemoto/_localBirdoApp.json";
			if(!BD1_FileExists(shortPathJson)){
				Print("[ERROR] Usuario do Windows com caracteres invalidos! Salve o Json com o shortname antes de continuar!");
			}
			userFolderShortName = BD1_ReadJSONFile(shortPathJson)["userFolder_short"];
			var newPath = dirPath.replace(systemUser, userFolderShortName);
			Print("Path name replace: " + userFolderShortName);
			return newPath;
		}
	}
	Print("No Need to change path: " + dirPath);
	return dirPath;	
}

/*
	retorna um nome unico de colum para ser usada na cena, somando um prefixo a um numero unico
	@column_prefix => nome do prefixo da coluna a ser criada
*/
function BD2_getUniqueColumnName(column_prefix){
	var suffix = 0;
	var column_name = column_prefix;
	while(suffix < 2000){
		if(!column.type(column_name)){
			break;
		}
	      suffix = suffix + 1;
	      column_name = column_prefix + "_" + suffix;
	}	
	return column_name;
}

/*
	faz pergunta com Yes or No de opcao de resposta! Retorna true or false;
*/	
function BD2_AskQuestion(msg){
	return MessageBox.information(msg , 3, 4) == 3;
}

/*
	checa se o shot esta com o numero certo de frames baseado no animatic;
*/	
function BD2_checkFrames(){//Checa se a cena está com um numero diferente de frames do que deveria//
	var animatic_group = "Top/ANIMATIC_"
	var animatic = node.subNodes(animatic_group).filter(function(x){ return x.indexOf("Animatic") != -1 && node.type(x) == "READ";})[0];//animatic node
	if(!animatic){
		Print("No animatic node to check!");
		return true;
	}
	var columnAnimatic = node.linkedColumn(animatic,"DRAWING.ELEMENT");
	var arrayAnimatic = column.getDrawingTimings(columnAnimatic);
	var framesAnimatic = arrayAnimatic.length;
	if(framesAnimatic != frame.numberOf()){
		return BD2_AskQuestion("O Número de Frames desta cena está diferente do Animatic!\nTem certeza que quer renderizar assim mesmo?");
	}
	return true;
}

/*
muda os att do writenode baseado no STEP (se for comp usa o json de comp no config)
@projectData => objeto com info do projeto
@writeNode => caminho do node de write para mudar
@step => step para buscar o json do projeto com att do writeNode. COMP ou normal!
*/

function BD2_changeWriteNodeAtt(projectData, writeNode, output_name, step){
	
	var output_info = {};
	var attJsonFile = projectData.birdoApp + "config/projects/" + projectData.prefix + "/writenode_att.json";
	
	if(step == "COMP"){
		attJsonFile = projectData.birdoApp + "config/projects/" + projectData.prefix + "/writenode_att_comp.json";
	}
	
	if(!BD1_FileExists(attJsonFile)){
		Print("Erro ao encontrar o json de att do projeto: " + attJsonFile);
		return false;
	}
	var attData = BD1_ReadJSONFile(attJsonFile);
	
	Print("[BD2_CHANGEWRITENODEATT] : " + writeNode);

	//SETS THE OUTPUT PATH
	if(attData["EXPORT_TO_MOVIE"] == "Output Movie"){//if is movie type
		node.setTextAttr(writeNode, "MOVIE_PATH", 1, output_name);
		output_info["render_type"] = "movie";
		output_info["file_name"] = BD1_fileBasename(output_name);
		output_info["format"] = "mov";

	} else if(attData["EXPORT_TO_MOVIE"] == "Output Drawings"){//if is DRAWING seq type
		var drawing_name = output_name.replace(/(_|-)$/, "") + "_";
		node.setTextAttr(writeNode, "DRAWING_NAME", 1, drawing_name);
		output_info["render_type"] = "image";
		output_info["file_name"] = BD1_fileBasename(drawing_name);
		output_info["format"] = attData["DRAWING_TYPE"].split("_")[0].toLowerCase();
	}

	//loop for att and set them
	for(item in attData){			
		node.setTextAttr(writeNode, item, 1, attData[item]);
	}
	output_info["writeNode"] = writeNode;
	return output_info;
}

/*
muda o espaco de cor do projeto para COMP ou PRE_COMP
@projectData => objeto com info do projeto
@step => step para definir espaco de cor 'COMP' ou 'PRE_COMP'!
function BD2_setProjectColourSpace(projectData, step){
	var cs = projectData.getProjectCS(step);
	if(cs == "ACES"){
		var ocio = fileMapper.toScenePath(specialFolders.etc + "/colormanagement/config.ocio");
		if(!BD1_FileExists(ocio)){
			Print("Ocio not found in this computer!");
			return false
		}
		Print("OCIO check ok!");
	}
	
	var setCS_script_path = projectData.paths.birdoPackage + "utils/setColourSpace.js";
	
	Print("### Setting Color Space - " + cs + " ###");

	var require_script = require(setCS_script_path).setColourSpace(cs);
	
	if(!require_script){
		MessageBox.warning("ERROR CHANGING COLOUR SPACE: " + cs + "\nCheck MessageLog for details!",0,0);
		return false;
	} else {
		Print(require_script);
		return true;
	}
	
}
*/

/*
adicionar um palletOverride no node selecionado com a correcao de cor do projeto caso exista
@projectData => objeto com info do projeto
@initialNode => node para adicionar o Color-Override em cima
*/
function BD2_add_proj_CO_correction(projDATA, initialNode){
	
	var prefix = projDATA.prefix;
	var palet_correction = projDATA.birdoApp +  "templates/color_fix/" + prefix + "_FixColors.plt";
	var co_name = "CO_FixColor";
	if(!BD1_FileExists(palet_correction)){
		Print("No need for color correction in this project!!!");
		return false;
	}

	var up_node = node.srcNode(initialNode, 0);
	
	if(!up_node){
		Print("Node nao conectado!");
		return false;
	}
	
	if(check_if_has_colorCorretion()){
		var co = up_node;
	} else {
		var co = BD2_AddNodeUp(initialNode, co_name, "COLOR_OVERRIDE_TVG", false);
	}

	if(!co){
		Print("fail to add Color-Override!");
		return false;
	}	

	var coObj = node.getColorOverride(co);

	coObj.clearPalettes();
	coObj.addPalette(palet_correction);

	return co;
	
	///EXTRA FUNCION////
	function check_if_has_colorCorretion(){//checa se o node acima ja e um CO de fix color
		return node.type(up_node) == "COLOR_OVERRIDE_TVG" && node.getName(up_node).indexOf(co_name) != -1;
	}
		
}

/*
cria thumbnails para o node 
@nodePath => caminho do node
@update_existing => flag para determinar se vai criar thumbs para TODOS drawings ou somente os q ainda nao tem thumbs
*/
function BD2_GenerateThumbnailsForNode(nodePath, update_existing){
	
	var id = node.getElementId(nodePath);
	var nodeObj = {"node": nodePath, "drawings": []};
	var thumbnailsFolder = element.completeFolder(id) + "/.thumbnails/";
	for(var i=0; i<Drawing.numberOf(id); i++){
		var drawName = Drawing.name(id, i);		
		var drawfile = Drawing.filename(id, drawName);
		
		var drawObj = {
			"name": drawName,
			"filename": drawfile,
			"thumbnail": thumbnailsFolder + "." + element.physicalName(id) + drawName + ".tvg.png",
		};
		nodeObj["drawings"].push(drawObj);
	}
	
	if(!BD1_DirExist(thumbnailsFolder)){
		if(!BD1_createDirectoryREDE(thumbnailsFolder)){
			Print("fail to create thumbnails folder!");
			return false;
		}
	}

	var progressDlg;
	progressDlg = new QProgressDialog();
	progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.open();
	progressDlg.setRange(0, nodeObj["drawings"].length - 1);

	for(var i=0; i<nodeObj["drawings"].length; i++){
		var drawItem = nodeObj["drawings"][i];
		var msg = "Creating thumbnail for drawing: " + drawItem["name"];
		progressDlg.setValue(i);
		progressDlg.setLabelText(msg);
		Print(msg);
		
		if(!update_existing){
			if(BD1_FileExists(drawItem["thumbnail"])){
				Print("Thumb file already exists and no need to update: " + drawItem["thumbnail"]);
				nodeObj["drawings"][i]["status"] = true;
				continue;
			}
			BD1_convertTVGtoPNGThumbnail(drawItem["filename"], drawItem["thumbnail"]);
		} else {
			BD1_convertTVGtoPNGThumbnail(drawItem["filename"], drawItem["thumbnail"]);
		}

		nodeObj["drawings"][i]["status"] = BD1_FileExists(drawItem["thumbnail"]);
	}
	progressDlg.hide();
	
	return nodeObj;
}


///COLOR

/*
retorna os valores em rgb da cor  
@colorId => color id da cor desejada 
@formatCSS => flag para retornar formatado para css : rgb(r,g,b) ou objeto cru
*/
function BD2_GetColorValues(colorId, formatCSS){
	var paletteList = PaletteObjectManager.getScenePaletteList();
	var pallet = paletteList.findPaletteOfColor(colorId)	;
	var color = pallet.getColorById(colorId).colorData;
	if(formatCSS){
		var css = "rgb(" + color.r + ", " + color.g + ", " + color.b + ");";
		return css;
	}
	return color;
}

/*
retorna a paletta mais usada no node read
@nodePath => nome completo do node (path)
*/
function BD2_GetMostUsedPaletteInNode(nodePath){
	var col = node.linkedColumn(nodePath,"DRAWING.ELEMENT");
	var ElementId = column.getElementIdOfDrawing(col);
	var paleteList = PaletteObjectManager.getScenePaletteList();
	var paletesCounter = {};

	for(var i=0; i<Drawing.numberOf(ElementId); i++){
		var drawingId = Drawing.name(ElementId, i);
		var colorArray = DrawingTools.getDrawingUsedColors({elementId : ElementId, exposure : drawingId});
		for(var y = 0; y < colorArray.length; y++){
			var palette = paleteList.findPaletteOfColor(colorArray[y]);
			if(palette.id in paletesCounter){
				paletesCounter[palette.id]++;
			} else {
				paletesCounter[palette.id] = 0;
			}
		}
	}
	var itensList = Object.keys(paletesCounter);
	if(itensList.length == 0){
		Print("No palette found for node : " + nodePath);
		return false;
	}
	var mostUsedPaletteId = itensList[0];
	itensList.forEach(function(x){ 
										if(paletesCounter[x] > paletesCounter[mostUsedPaletteId]){
											mostUsedPaletteId = paletesCounter[x];
										}
									});
	return paleteList.getPaletteById(mostUsedPaletteId);
}
