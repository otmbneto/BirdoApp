/* v1.4 - adaptacao para o MALUQUINHO
-------------------------------------------------------------------------------
Name:		SG_SetOutputRender.js

Description:	Este script seta o output da cena para a pasta frames e faz parte da fazendinha. Uso como PRE_COMP, ou todos renders de mov antes da comp

Usage:		Usar como compile no script da farm e aplicar no pre-publish

Author:		Leonardo Bazilio Bentolila

Created:	atualizacao - novembro, 2021.

Copyright:  leobazao_@Birdo

-------------------------------------------------------------------------------
//OBD: este script renderiza somente o mov da cena full, no writeFINAL... se houver saidas diferentes da full, ele nao exporta!!!!


 */

SetOutputRender();

function SetOutputRender() {
	
	var currentScene = scene.currentScene();
	var setup = "Top/SETUP";//grupo do setup na cena;
	var writeFinal = setup + "/Write_FINAL";//Nome do write node FINAL dentro do SETUP;
	
	//attributos do WriteFINAL//
	var writeFINAL_Attr = {
		"EXPORT_TO_MOVIE": "Output Movie",
		"DRAWING_NAME": "frames/final-",
		"MOVIE_PATH": "PLACE/HOLDER",
		"MOVIE_FORMAT": "com.toonboom.quicktime.legacy",
		"MOVIE_AUDIO": "",
		"MOVIE_VIDEO": "",
		"MOVIE_VIDEOAUDIO": "Enable Sound(true)Enable Video(true)QT(000000000000000000000000000003BE7365616E000000010000000600000000000001AF76696465000000010000001000000000000000227370746C000000010000000000000000726C652000000000002000000400000000207470726C000000010000000000000000000000000000000000000000000000246472617400000001000000000000000000000000000000000000000000000000000000156D70736F00000001000000000000000000000000186D66726100000001000000000000000000000000000000187073667200000001000000000000000000000000000000156266726100000001000000000000000000000000166D70657300000001000000000000000000000000002868617264000000010000000000000000000000000000000000000000000000000000000000000016656E647300000001000000000000000000000000001663666C67000000010000000000000000004400000018636D66720000000100000000000000006170706C00000014636C757400000001000000000000000000000014636465630000000100000000000000000000001C766572730000000100000000000000000003001C000100000000001574726E6300000001000000000000000000000001066973697A00000001000000090000000000000018697764740000000100000000000000000000000000000018696867740000000100000000000000000000000000000018707764740000000100000000000000000000000000000018706867740000000100000000000000000000000000000034636C617000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000001C706173700000000100000000000000000000000000000000000000187363616D000000010000000000000000000000000000001564696E74000000010000000000000000000000001575656E66000000010000000000000000000000008C736F756E0000000100000005000000000000001873736374000000010000000000000000736F777400000018737372740000000100000000000000005622000000000016737373730000000100000000000000000010000000167373636300000001000000000000000000010000001C76657273000000010000000000000000000300140001000000000015656E76690000000100000000000000000100000015656E736F000000010000000000000000010000003F7361766500000001000000020000000000000015666173740000000100000000000000000000000016737374790000000100000000000000000001)",
		"LEADING_ZEROS": 3,
		"START": 1,
		"DRAWING_TYPE": "TGA",
		"ENABLING.FILTER": "Always Enabled",
		"ENABLING.FILTER_NAME": "",
		"ENABLING.FILTER_RES_X": 720,
		"ENABLING.FILTER_RES_Y": 540,
		"COMPOSITE_PARTITIONING": "Off",
		"Z_PARTITION_RANGE": 1,
		"CLEAN_UP_PARTITION_FOLDERS": true
		}
		
	if (node.getName(writeFinal) == ""){
		Print("ERROR! WriteFINAL nao encontrado... cancelando!");
		return false;
	} 
	
	//change write node attributes
	setWriteFINAL_attributes(writeFinal, writeFINAL_Attr);
	
		
	var renderPath = scene.currentProjectPath() + "/frames/";
	
	if (dirExists(renderPath)) {
		Print("Creating directory: " + renderPath);
		removeDirs(renderPath);
		createDirectory(renderPath);
	}
	
	renderPath += currentScene;
	
	changeExport(writeFinal, renderPath); //acerta o caminho do Write FINAL
	
	
	var allWriteNodes = node.getNodes(["WRITE"]);
	
	//DELETA todos os write nodes q nao sao o final. ##FIXME: Mudar essa parte se precisar para o render da COMP
	for (var i = 0; i < allWriteNodes.length; i++) {
		if (allWriteNodes[i] != writeFinal) {
			Print("removing write node: " + allWriteNodes[i]);
			node.deleteNode(allWriteNodes[i], false, false);
		}
	
	}
	
	Print("SetOutputRender done!");
	
	//////////////////funcoes extras
	
	function changeExport(nodeWrite, movieNAME) { //funcao para mudar o WRITE node dado como parametro para o caminho dado
		if (node.setTextAttr(nodeWrite, "MOVIE_PATH", 0, movieNAME)) {
			Print("Output set: " + nodeWrite + " : " + movieNAME);
			return true;
		} else {
			Print("no need to change render path output: " + nodeWrite + " : " + movieNAME);
			return false;
		}
	}
	
	function setWriteFINAL_attributes(writeFINAL, object_att){//seta os att do writeFINAL_Attr no node 
		var counter = 0;
		for (var att in object_att){
			if(node.setTextAttr(writeFINAL, att, 0, object_att[att])){
				counter++;
			}
		}
		Print(counter + " atributos do node: " + writeFINAL + " foram atualizados!");
	}
	
	function removeDirs(dirPath){
		var dir = new Dir;
		dir.path = dirPath;
		if(!dir.exists){
			MessageLog.trace("[REMOVEDIR] Diretorio nao encontrado: " + dirPath);
			return false;
		}
		try {
			dir.rmdirs();
			MessageLog.trace("[REMOVEDIR] Diretorio removido..." + dirPath);
		} catch (err){
			Print(err);
			return false;
		}
		return true;
	}
	
	function createDirectory(path) {
		var save_dir = new Dir(path);
		if (!save_dir.exists) {
	
			try {
				save_dir.mkdirs();
			} catch (error) {
				Print(error);
				return false;
			}
		}
		return true;
	}
	
	function dirExists(path) {
		var dir = new Dir(path);
		return dir.exists;
	
	}
	
	function Print(msg) {
		if (typeof msg == "object") {
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
}