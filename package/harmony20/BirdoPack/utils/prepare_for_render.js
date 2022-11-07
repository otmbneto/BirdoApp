include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*   OBS2: somente adiciona o color fix do projeto se for COMP
-------------------------------------------------------------------------------
Name:		prepare_for_render.js

Description:	Este script roda tudo que for necessario para o render do projeto baseado no STEP - pre_comp ou comp;

Usage:		usar como require e com parametro para dizer se e pre_comp ou comp e o objeto do projData. Retorna objeto com info dos outputs;

Author:		Leonardo Bazilio Bentolila

Created:	Janeiro, 2022;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function prepare_for_render(projData, render_step, use_extra_writenodes){
	
	var step = 	render_step == "COMP" ? "COMP" : "PRE_COMP";

	//objeto com info do output esperado
	var output_data = {
		"render_comp": projData.getRenderComp(projData.entity.name),
		"folder": null, 
		"render_number": 0, 
		"frames_number": frame.numberOf(),
		"file_list": []
	};
	
	//sets the colour space for the step
	var setCS = projData.setProjectCS(step);
	if(!setCS){
		Print("[ERROR]Fail to set projectColourSpace!");
		return false;
	}
	
	//sets scene project resolution and fps
	if(projData.setProjectResolution(step)){
		Print("Project resolution set!");
	} else {
		Print("Fail to set secene project Resolution!");	
	}
	
	//clean frames folder
	var renderPath = scene.currentProjectPath() + "/frames/";

	if(!BD1_CleanFolder(renderPath)){
		Print("[ERROR]Fail cleaning render destination folder!");
		return false;
	}
	
	//project modify scene before render
	projData.modifyScenePreRender(step);
	
	checkForIrregularNodesForRender();
	
	output_data["folder"] = renderPath;

	//acerta os writeNodes
	output_data["file_list"] = setWriteNodes(projData, step, renderPath);
	output_data["render_number"] = output_data["file_list"].length;
	
	return output_data;
	
	/////EXTRA FUNCTIONS////
	function setWriteNodes(projData, render_step, output_path){//prepara os writeNodes para o render
		var finalWrite = "Top/SETUP/Write_FINAL";
		var writes = node.getNodes(["WRITE"]);
		var extra_write_counter = 0;
		var info_list = [];
		var currscene = projData.entity.name;
		var render_name = output_path + currscene;
		var mov_name = "frames/exportFINAL";

		if(node.getName(finalWrite) == ""){
			Print("Fail to find writeFINAL for this scene!");
			return false;
		}
		
		//Força o writeFINAL a ficar abilitado de inicio
		node.setEnable(finalWrite, true);
		
		Print("RENDER STEP: " + render_step);
		Print("Seting WriteFinal: ");
		//SET THE FINALWRITE ALWAYS FOR PRE_COMP
		var updateWriteFinal = BD2_changeWriteNodeAtt(projData, finalWrite, mov_name, "PRE_COMP");
		Print("WriteFINAL set: ");
		Print(updateWriteFinal);
		
		
		//Valida o WriteFINAL em caso de COMP:
			//SE SOMENTE TIVER O WRITE FINAL NA CENA, MUDA O WRITEFINAL PARA COMP
			//SE TIVER MAIS DE UM WRITENODE, IGNORA O WRITEFINAL
		if(render_step == "COMP"){
			if(writes.length == 1){
				Print("Seting writeFinal for comp");
				updateWriteFinal = BD2_changeWriteNodeAtt(projData, finalWrite, render_name, "COMP");
				Print("WriteFINAL set: ");
				Print(updateWriteFinal);
				//if write node is NOT a matte treatment, add color fix
				Print("####Add color fix: " + finalWrite);
				Print("####>> " + BD2_add_proj_CO_correction(projData, finalWrite));
				info_list.push(updateWriteFinal);
			} else {
				Print("Disabled WriteFINAL for COMP!");	
				node.setEnable(finalWrite, false);
			}
		} else {
			//atualiza as infos do writeFINAL na lista
			info_list.push(updateWriteFinal);
		}
		
		for(var i=0; i<writes.length; i++){
			
			if(writes[i] == finalWrite){
				continue;
 			}
			
			Print(" --- Setting writeNode: " + writes[i] + " ----");
			
			//desabilita qualquer writeNOde q nao seja o final se a flag "use_extra_writenodes" for false
			node.setEnable(writes[i], use_extra_writenodes);
			Print("Write node " + writes[i] + " : enabled: " + use_extra_writenodes);
			
			if(!use_extra_writenodes){
				continue;
			}
				
			var output_name = validadeWriteNode(writes[i]);
				
			if(!output_name){//se nao for um write valido, deleta
				node.deleteNode(writes[i], false, false);
				Print("WriteNode deleted!");
				continue;
			}
			
			var output_fullname = render_name + output_name;
			var setWriteNode = BD2_changeWriteNodeAtt(projData, writes[i], output_fullname, "COMP"); //extra writes are always COMP
			Print("__Write node " + writes[i] + " is set: ");
			Print(setWriteNode);
		
			if(check_duplicity(setWriteNode, info_list)){//checa se a saida do writeNode e repetida
				info_list.push(setWriteNode);
				extra_write_counter++;
			} else {
				node.deleteNode(writes[i], false, false);
				Print("WriteNode deleted!");
				continue;
			}

			if(render_step == "COMP" && node.getName(writes[i]).indexOf("MATTE") == -1){//adiciona CO de fix de cor do projeto
				Print("####Add color fix: " + writes[i]);
				Print("####>> " + BD2_add_proj_CO_correction(projData, writes[i]));
			}
		}

		Print("#########WriteNodes was seted! " + extra_write_counter + " extra writeNode validated!#########");

		return info_list;
		
		///EXTRA FUNCTIONS - setwriteNodes()
		function validadeWriteNode(writeNode){//checa se o writeNode e valido e retorna o nome dos outputs
			if(!node.isLinked(writeNode, 0)){
				Print("unconnected writeNode: " + writeNode);
				return false;
			}
			return getOuputName(writeNode);
		}

		function getOuputName(writeNode){//retorna os basename do nome de saida do writeNode (procura no "DRAWING_NAME" e "MOVIE_PATH")

			var render_movie_path_full = node.getTextAttr(writeNode, 1, "MOVIE_PATH");
			var render_draw_path_full = node.getTextAttr(writeNode, 1, "DRAWING_NAME");
			
			if(!render_movie_path_full && !render_draw_path_full){
				Print("invalid writeNode: " + writeNode);
				return false;	
			}
			
			var splitNameMov = render_movie_path_full.split("/");
			var splitNameDraw = render_draw_path_full.split("/");

			var movName = splitNameMov[splitNameMov.length-1];
			var drawName = splitNameDraw[splitNameDraw.length-1];
			
			//TESTE SE CONTEM O NOME DA CENA NO OUTPUT PRA CONSIDERAR VALIDO
			if(drawName.indexOf(currscene) != -1){
				var finalName = drawName.replace(currscene, "");
				return finalName;
			}
			if(movName.indexOf(currscene) != -1){
				var finalName = movName.replace(currscene, "");
				return finalName;
			}
			
			//nao encontrou nenhum output valido no writenode (nomes das saidas nao continham o nome da cena!)
			return false;
		}
		
		function check_duplicity(writeNodeData, info_list){//checa duplicidade da saida do writeNode setado para a lista de nodes existentes
			for(var i=0; i<info_list.length; i++){
				if(info_list[i]["file_name"] == writeNodeData["file_name"] && info_list[i]["format"] == writeNodeData["format"]){
					Print("---Nome duplicado de output do writeNode: " + writeNodeData["writeNode"]);
					return false;
				}
			}			
			return true;	
		}
	}
	
	//remove invalid nodes in the scene
	function checkForIrregularNodesForRender(){
		var count = 0;
		var groups = BD2_ListNodesInGroup(node.root(), ["GROUP"], true);
		for(var i=0; i<groups.length; i++){
			if(checkNode(groups[i])){
				Print("invalid node found: " + groups[i]);
				node.deleteNode(groups[i], false, false);	
				count++;
			}
		}
		Print("--irregular nodes check ended with " + count + " nodes deleted!");

		//check if nod is invalid
		function checkNode(nodeGroup){
			var source = node.srcNode(nodeGroup, 0);
			var subs = node.subNodes(nodeGroup);
			return source == "" && subs.length == 3 && node.isGroup(nodeGroup);
		}
	}
}

exports.prepare_for_render = prepare_for_render;
