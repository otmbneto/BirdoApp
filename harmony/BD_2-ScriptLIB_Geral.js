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

/*
	retorna lista com values do objeto!
*/
function BD2_listObjectValues(obj){
	return Object.keys(obj).map(function(item){ return obj[item];});
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
/*
	retorna info do rig do node dado como full node, nome do rig
*/
function BD2_getNodeRigData(nodeP, proj_data){
	var namesplit = nodeP.split("/");
	var rig_full_regex = proj_data.get_rig_regex();
	var index_regex = /_(\d+|\d)$/;//sujeira no nome do node (sufixo criado pelo harmony)
	var rig_name = proj_data.pattern.asset.test(nodeP) ? proj_data.pattern.asset.exec(nodeP)[0] : null;
	var rig_node = rig_name ? namesplit.slice(0, namesplit.indexOf(rig_name)+1).join("/") : null;
	var fullname =  rig_full_regex.test(nodeP) ? rig_full_regex.exec(nodeP)[0] : null;
	var fullnode = fullname ? namesplit.slice(0, namesplit.indexOf(fullname)+1).join("/") : null;
	var version = proj_data.pattern.version.test(nodeP) ? proj_data.pattern.version.exec(nodeP)[0] : null;
	return {
		rig_name: rig_name.replace(index_regex, "") ,
		char_name: rig_name ? rig_name.replace(rig_name.split("_")[0] + "_", "").replace(index_regex, ""): null,
		rig_node: rig_node, 
		full_name: fullname,
		full_node: fullnode,
		prefix: rig_name ? rig_name.split("_")[0] : null,
		version: version
	};
}


/*
	deleta copia o node e cola no mesmo lugar e conexoes anteriores 
	(serve pra atalizar os atts do node em alguns casos)
*/
function BD2_updateNode(nodeP){
	selection.clearSelection();
	var coordRect = BD2_createRectCoord(nodeP);
	var nodeConnectionsData = BD2_get_node_connections_data(nodeP);

	var dragObj = copyPaste.copy([nodeP], frame.current(), 1, copyPaste.getCurrentCreateOptions());
	copyPaste.pasteNewNodes(dragObj, node.parentNode(nodeP), copyPaste.getCurrentPasteOptions());
	var sNewMCNodeCopy = selection.selectedNode(0);
	var sOriginalNameOnly = node.getName(nodeP);
	BD2_unlink_all(nodeConnectionsData, nodeP);
	node.deleteNode(nodeP);
	node.rename(sNewMCNodeCopy, sOriginalNameOnly);
	BD2_ApplyNodeQRectCoord(coordRect, nodeP);
	BD2_connect_node(nodeConnectionsData, nodeP);
}

/*
	retorna um objeto com info das conexoes do node
*/
function BD2_get_node_connections_data(node_path){
	var c_data = {
		source_node:  node_path,
		input: [],
		output: []
	};
	for(var i=0; i< node.numberOfInputPorts(node_path); i++){
			var upnode = node.srcNodeInfo(node_path, i);
			if(Boolean(upnode)){
				c_data["input"].push(upnode);	
			}
	}
	for(var i=0; i<node.numberOfOutputPorts(node_path); i++){
		var links = [];
		for(var y=0; y<node.numberOfOutputLinks(node_path, i); y++){
			var downNode = node.dstNodeInfo(node_path, i, y);
			if(Boolean(downNode)){
				links.push(downNode);
			}
		}	
		c_data["output"].push(links);	
	}
	return c_data;
}

/*
	copia as conexoes do nodeConnections data object da funcao get_node_connections_data
	para o node dado
*/
function BD2_connect_node(connections_data, node_path, connection){
	//connect inputs
	Print(">> Connect nodes (SOURCE NODE): " + node_path.source_node);
	Print("reconnect inputs: ");
	if(!connection || connection == "input"){
		connections_data.input.forEach(function(node_info, p){
			if(node_info){
				Print(node.link(node_info.node, node_info.port, node_path, p, !node.isLinked(node_info.node, node_info.port), true));
			}
		});
	}
	//connect outputs
	Print("reconnect outputs: ");
	if(!connection || connection == "output"){
		connections_data.output.forEach(function(links, p){
			if(links.length != 0){
				links.forEach(function(node_info, link){
					if(!node.dstNodeInfo(node_path, p, link)){
						Print(node.link(node_path, p, node_info.node, node_info.port));
					}
				});
			}
		});
	}	
}


/*
	unlink all nodes connections	
*/
function BD2_unlink_all(connections_data, nodeP){
	for(var i=connections_data.input.length; i>=0; i--){
		node.unlink(nodeP, i);
	}
	connections_data.output.forEach(function(item, index){
		for(var i=0; i<item.length; i++){
			node.unlink(item[i].node, item[i].port);
		}
	});
}

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
			if(col && !only_columns){
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


/*conecta o node dado, abaixo do node selecionado.
@selectedNode => selected Node
@nodeToConnect => node a ser conectado
@ports => obejto no formato {i:0, o:0} sendo i = input e o = output
@connect_btween => bool pra determinar se conecta o node entre o node de destino e o selectedNode
*/
function BD2_ConnectNodeUnder(selectedNode, nodeToConnect, ports, connect_btween){
	//ports to connect
	if(!ports){
		ports = {"i" : 0, "o": 0};
	}
	// getCoordinates
	var nodeRect = BD2_createRectCoord(selectedNode);
	var compInfo = node.dstNodeInfo(selectedNode, 0, 0);
	if(!compInfo || !connect_btween){
		var coordX =  nodeRect.center().x() - (node.width(nodeToConnect)/2);
		var coordY = nodeRect.y() + 50;
	} else {
		var compRect = BD2_createRectCoord(compInfo.node);
		var finalRect = nodeRect.united(compRect);
		var coordX =  finalRect.center().x() - (node.width(nodeToConnect)/2);
		var coordY = finalRect.center().y();
		//unlink selected to original comp
		node.unlink(compInfo.node, compInfo.port);
		//link node to comp
		node.link(nodeToConnect, ports.o, compInfo.node, compInfo.port, false, true);
	}
	//link selected node
	node.link(selectedNode, 0, nodeToConnect, ports.i, false, false);
	//update node coordinates
	node.setCoord(nodeToConnect, coordX, coordY, 1);
}

/*Adiciona um node embaixo ao node selecionado 
@nodeSel => selected Node
@nodeName => new node name
@type => node type like "BLUR".. "WRITE"...
@end_connection => if its a end type node like Display or Write (bool)
*/
function BD2_AddNodeUnder(nodeSel, nodeName, type, end_connection, nodePort){

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
	if(nodePort == undefined){
		var nodePort = node.numberOfOutputPorts(nodeSel) -1;
	}	
	var newNode = node.add(parentGroup, nodeName, type, newX, newY, 0);

	if(!end_connection){
		var compPort = node.dstNodeInfo(nodeSel, nodePort, 0).port;
		var comp = node.dstNode(nodeSel, nodePort, 0);
		node.unlink(comp, compPort);
		node.link(newNode, 0, comp, compPort, false, true);
	}

	node.link(nodeSel, nodePort, newNode, 0, false, false);
	return newNode;
}

/*Adiciona um node acima ao node selecionado 
@nodeSel => selected Node
@nodeName => new node name
@type => node type like "BLUR".. "WRITE"...
@end_connection => se nao houver mais nodes acima do node selecionado
*/
function BD2_AddNodeUp(nodeSel, nodeName, type){

	var parentGroup = node.parentNode(nodeSel);
	var coord = BD2_get_node_coord(nodeSel);

	var newY = coord.y - 70;
	
	var newNode = node.add(parentGroup, nodeName, type, coord.x, newY, 0);
	//fix x value
	var newX = coord.x + ((coord.w - node.width(newNode))/2);
	node.setCoord(newNode, newX, newY);

	var up_node = node.srcNodeInfo(nodeSel, 0);
	if(up_node){
		node.unlink(nodeSel, 0);	
		node.link(up_node.node, up_node.port, newNode, 0, false, false);
	}
	node.link(newNode, 0, nodeSel, 0);

	return newNode;
}

/*Adiciona um node 
@parentGroup => parent group to add
@name => new node name
@coord => object with coordinates info
*/
function BD2_addNode(type, parentGroup, name, coord){
	if(type == "READ"){
		var elemId = element.add(name, "COLOR", scene.numberOfUnitsZ(), "SCAN", "TVG");
		if(elemId == -1){
			Print("falha ao criar elemento com nome> " + name);
			return null; // no read to add.
		}
		var uniqueColumnName = BD2_getUniqueColumnName(name);
		column.add(uniqueColumnName , "DRAWING");
		column.setElementIdOfDrawing( uniqueColumnName, elemId );

		var read = node.add(parentGroup, name, "READ", coord.x, coord.y, coord.z);
		node.linkAttr(read, "DRAWING.ELEMENT", uniqueColumnName);
		return read;
	} 
	return node.add(parentGroup, name, type, coord.x, coord.y, coord.z);
}


/*
	create QRect from node coordenates
*/
function BD2_createRectCoord(node_path){
	var rect = new QRect(node.coordX(node_path), node.coordY(node_path), node.width(node_path), node.height(node_path));
	return rect;	
}

/*
	set node coord from QRect
*/
function BD2_ApplyNodeQRectCoord(rect_coord, nodeP){
	return node.setCoord(nodeP, rect_coord.x(), rect_coord.y());
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

/*retorna se o node é do tipo Transformation Type
@nodeP => path do group node pra checar
*/
function BD2_isTransformationNode(nodeP){
	var transtypelist = ["Shake","ORTHOLOCK","Quake","PEG","QUADMAP","TransformLoop"];
	return transtypelist.indexOf(node.type(nodeP)) != -1;
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

/*Retorna se o node drawing está sendo usado no frame (se está enquadrado na camera - area de render)
@projData => objeto de info dos projetos
@atframe => frame para testar
@node_path => path do node a ser testado
*/
function BD2_isInCameraFrame(projData, atframe, node_path){
	
	//get require utils files
	var utils_script = projData.paths.birdoPackage + "utils/add_gradient_utils.js";
	var utils = require(utils_script);
	
	var drawing_util_script = projData.paths.birdoPackage + "utils/drawing_api.js";
	var drawing_util = require(drawing_util_script);
	
	//create rects
	var nodeRect = utils.generateDrawingRectPosition(node_path, atframe, drawing_util);
	var camRect = utils.getCameraRectPosition(atframe, drawing_util);
	return camRect.intersects(nodeRect);
	
}

//################BATCH#########################//
/*Roda o script dado na cena dada
@tbFile => caminho do arquivo para rodar os scritp (com versao .xstage)
@scriptName => nome do script para ser rodado
@readOnly => true para nao modificar o aruqivo quando rodar o script
*/
function BD2_CompileScript(tbFile, scriptName, readOnly){
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
	if(readOnly){
		commandArguments.push("-readonly");
	}
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
	var birdoApp_scripts = System.getenv("TOONBOOM_GLOBAL_SCRIPT_LOCATION");
	if(!birdoApp_scripts || birdoApp_scripts.indexOf("BirdoApp") == -1){
		Print("[BIRDOAPP] variavel do harmony 'TOONBOOM_GLOBAL_SCRIPT_LOCATION' não está instalada para o BirdoApp!");
		return false;
	}
	var birdoPackage = BD2_FormatPathOS(birdoApp_scripts + "/birdoPack/");
	var pathsScript = birdoPackage + "birdoapp_init.js";
	
	if(!BD1_FileExists(pathsScript)){
		Print("[BIRDOAPP][ERROR] Script 'birdoapp_init.js' nao encontrado! Nao sera possivel iniciar o BirdoApp no Harmony!");
		return false;
	}
	
	//cria a classe do birdo_init
	var birdoApp = require(pathsScript).birdoapp_init(birdoApp_scripts);
	
	//atualiza a classe paths com o caminho do root do harmony package Birdo
	birdoApp.paths["birdoPackage"] = birdoPackage;

	return birdoApp;
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


/*
formata uma string com zeros a esquerda e.g 01,001,0001,etc...
*/
function BD2_zerosFill(number, zeros){
	var dig = zeros.length * -1;
	zeros += number.toString();
	return zeros.slice(dig);
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
add exposure 'Zzero' to drawing column
@coluna > draing column to add exposure 'Zzero'
@frame > number of frame to add exposure 'Zzero'
*/
function BD2_addZzero(coluna, frame){
	var zzero = "Zzero";//nome do Zzero
	fixeCaseSensitivity(coluna);
	return column.setEntry(coluna, 1, frame, zzero);
	//extra function
	function fixeCaseSensitivity(coluna){//se tiver conflito de case sensitivity, renomeia o drawing antes de trocar
		var timmings = column.getDrawingTimings(coluna);
		for(var i=0; i<timmings.length; i++){
			if(timmings[i].toString().toLowerCase() == zzero.toLowerCase()){
				if(timmings[i] != zzero){
					column.renameDrawing(coluna, timmings[i], zzero);
					Print("Conflito Case Sensitivity na camada: " + column.getDisplayName(coluna) + " ==> atualizado para: " + zzero);
				}
			}	
		}
	}
}
/*
renomeia a camada com o prefixo para o proximo numero disponivel do drawing
@current_drawing > nome do drawing para ser mudado
@prefixo > prefixo para o novo nome dos drawings
@coluna > nome da coluna do drawing
*/
function BD2_RenameDrawingWithNumber(coluna, current_drawing, prefixo){
	var number = 1;
	var timmings = column.getDrawingTimings(coluna);
	var new_name = prefixo + number;

	while(true){
		if(timmings.indexOf(new_name) == -1){
			column.renameDrawing(coluna, current_drawing, new_name);
			Print("[RENAME_DRAWING_WITH_NUMBER] drawing was renamed from : " + current_drawing + " to " + new_name + " in  layer :" +  column.getDisplayName(coluna));
			return new_name;
		}
		number++;
		new_name = prefixo + number;
	}
	Print("[RENAME_DRAWING_WITH_NUMBER] Something went wrong.. number limit !");
	return false;
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
@wait => Boolean para definir se e pra esperar o processo do loading esperar ou nao
*/
function BD2_loadingBirdo(birdoAppPath, timeout, loadingtext){
	
	var text_formated = loadingtext.replace(/\s/g, "^");
	var pythonPath = BD2_FormatPathOS(birdoAppPath + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(birdoAppPath + "app/utils/loadingDialog.py");
	var start = Process2(pythonPath, pyFile, timeout, text_formated);
    var ret = start.launchAndDetach();
	if(ret != 0){
		Print("Fail to start progressBirdo progress!");
		return false;
	}
		
	return start;
}

/*
	Formata o caminho pro OS usado
	@path => caminho a ser mudado
*/
function BD2_FormatPathOS(path){
	return BD2_RenameAll(fileMapper.toNativePath(path), "\\", "/");
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
	var value = MessageBox.information(msg , MessageBox.Yes, MessageBox.No)
	return value == 16384;
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
retorna um objeto com info do output esperado do writenode
*/

function BD2_changeWriteNodeAtt(projectData, writeNode, output_name, step){
	
	var output_info = {};
	var attData = projectData.getWriteNodeAtt(step);
	
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
	get current selected color
*/
function BD2_get_current_color(){
	var paletteList = PaletteObjectManager.getScenePaletteList();
	var curr_cor_id = PaletteManager.getCurrentColorId();
	var curr_pal_id = PaletteManager.getCurrentPaletteId();
	var palete = paletteList.getPaletteById(curr_pal_id);
	var cor = palete.getColorById(curr_cor_id);
	return cor;
}

/*
	converte cor da palete para QColor
*/
function BD2_createQColor(palColor){//cria cor QColor baseado numa cor de uma palette
	return new QColor(palColor.colorData.r, palColor.colorData.g, palColor.colorData.b, palColor.colorData.a);	
}

/*
	converte cor para valor numerico unico
*/
function BD2_fromRGBAtoInt(r, g, b, a){
  return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}
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

//############# waypoints ######################
/*
	conecta dois nodes com waypoint entre eles (retorna wp)	
	DESCOBRIR: só funciona na Top view??? 
*/
function BD2_connectWithWaypoint(nodeA, nodeB, createPort){
	var nodeARect = BD2_createRectCoord(nodeA); 
	var nodeBRect = BD2_createRectCoord(nodeB); 
	var parentN = node.parentNode(nodeA);
	var wp_coord = new Point2d(nodeARect.center().x(), nodeARect.y() + (nodeBRect.y() - nodeARect.y())/2);
	var wp = parentN + "/" + waypoint.add(parentN, "wp_", wp_coord.x, wp_coord.y);
	Print("connect with node: " + waypoint.linkOutportToWaypoint(nodeA, 0, wp));
	Print("connect with comp: " + waypoint.linkWaypointToInport(wp, nodeB, 0, createPort));
	return wp;
}

/*
	return the current NV group
*/
function BD2_getCurrentGroupNV(){
    var nodeview = view.viewList().filter(function(item){ return view.type(item) == "Node View"});
    return view.group(nodeview[0]);
}

/*
	retorna a proxima porta output NAO conectada do node
*/
function BD2_GetNextOuputPort(node_path){
	var port = node.numberOfOutputPorts(node_path) - 1;
	while(port > 0){
		if(!node.dstNode(node_path, port, 0)){
			break;
		}
		port--; 
	}
	return port;
}