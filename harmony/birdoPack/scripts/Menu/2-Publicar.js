/*
	Script para fazer publish da cena na rede do projeto

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function Publicar(){
				
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		Print("[BIRDOAPP][PUBLISH] ERRO gerando dados do Birdoapp...");
		return false;
	}
	
	var publish_data = PublishDialog(projectDATA);
	if(!publish_data){
		Print("Canceled...");
		return;
	}
	
	//aviso sobre quantidade de frames da cena em relacao ao animatic
	if(projectDATA["render_farm"]){
		if(!BD2_checkFrames()){
			Print("cancelado pelo usuario por estar sem o numero de frames corretos!");
			return;
		}
	}
	
	//roda o script pre-publish com todas funcoes q modificam a cena antes de enviar
	var pre_publish_js = projectDATA.proj_confg_root + "pre_publish.js";
	if(BD1_FileExists(pre_publish_js)){
		require(pre_publish_js).pre_publish(projectDATA);
	} else {
		Print("Nenhum script pre_publish.js encontrado para o projeto.");
	}
	
	//salva a cena antes de enviar
	scene.saveAll();
	
	//compacta o arquivo para envio
	try{
		var compactJs = projectDATA.paths.birdoPackage + "utils/compact_version.js";
		var compact_version_data = require(compactJs).create_compact_file_list(true);
		if(!compact_version_data){
			MessageBox.warning("ERRO ao listar arquivos para compactar!", 0, 0);
			return;
		}
		var publish_temp = projectDATA.systemTempFolder + "/BirdoApp/publish_scene/";
		if(!BD1_CleanFolder(publish_temp)){
			Print("Falha em criar o folder temp!");
			return;
		}
		var sc_json = publish_temp + "_sc_data.json";
		if(!BD1_WriteJsonFile(compact_version_data, sc_json)){
			MessageBox.warning("ERROR! Não foi possível criar o json temp com dados da cena para compactar!",0,0);
			return false;
		}
	} catch(e){
		Print(e);
		MessageBox.warning("ERROR! Não foi possível criar o json temp com dados da cena para compactar!",0,0);
		return;
	}
	
	try{
		//run publish python script
		if(run_publish_python(projectDATA, publish_data["publish_step"], projectDATA.entity.name, sc_json)){
			Print("[BIRDOAPP] - Publish python scritp foi um sucesso!");
			//update publish_data value with publishied file path
			if(BD1_FileExists(sc_json)){
				var data = BD1_ReadJSONFile(sc_json);
				publish_data["published_file"] = data.published_file;
			}
		} else{
			MessageBox.warning("PUBLISH SCENE ERROR! Nao foi possivel publicar a cena. Verifique o terminal para mais detalhes.", 0, 0);
			return;
		}
		//roda o script post-publish com todas funcoes q modificam a cena antes de enviar
		var pos_publish_js = projectDATA.proj_confg_root + "pos_publish.js";
		if(BD1_FileExists(pos_publish_js)){
			require(pos_publish_js).pos_publish(projectDATA, publish_data);
			Print("[BIRDOAPP] Acoes de pos publish finalizadas!");
		} else {
			Print("[BIRDOAPP] Nenhum script pre_publish.js encontrado para o projeto.");
		}
	} catch(e){
		Print(e);
	}
}
exports.Publicar = Publicar;


function run_publish_python(proj_data, step, scene_name, sc_data_file){
	Print("[BIRDOAPP] Rodando script publish em python...");
	try{
		var python = proj_data.birdoApp + "venv/Scripts/python.exe";
		var pyFile = proj_data.birdoApp + "app/utils/publish_scene.py";
		var start = Process2(python, pyFile, proj_data.id, step, scene_name, sc_data_file);
		var ret = start.launch();
		return ret == 0;
	} catch (e){
		Print(e);
		return false;
	}
}


//gera OBJETO com opcoes de publish
function PublishDialog(proj_data){
	
	var publish_steps = proj_data.getPublishStep().sort();
	var render_steps = proj_data.getRenderStep();
	
	//escolhe o step atual da cena (caso exista);
	var curr_step = "N.A";
	var scene_path = scene.currentProjectPath();
	for(var i=0; i<publish_steps.length; i++){
		if(scene_path.indexOf(publish_steps[i]) != -1){
			curr_step = publish_steps[i];
			break;
		}
	}
	
	if(publish_steps.length == 1 && !proj_data["render_farm"]){
		return {"publish_step": publish_steps[0], "render_step": render_steps[0], "send_farm": false};
	}
	
	var options = {};
	var d = new Dialog;
	d.title = "BIRDOAPP Publish";
	
	if(publish_steps.length > 1){
		var publishGroup = new GroupBox;
		var publish_step = new ComboBox();
		var label = new Label();
		publishGroup.add(publish_step);
		publishGroup.addSpace(5);
		publishGroup.add(label);
		d.add(publishGroup);
		d.addSpace(5);
		publish_step.itemList = publish_steps;
		publish_step.label = "Escolha o Step do PUBLISH:\n(Step ATUAL: " + curr_step + ")";
		if(curr_step != "N.A"){
			publish_step.currentItem = curr_step;
		}
		label.text = "Atenção: Somente escolha um step diferente do atual da cena\nse tiver CERTEZA do que está fazendo!";
		publishGroup.title = "Opções de Publish";
	}
	
	if(proj_data["render_farm"]){
		var renderGroup = new GroupBox;
		var render_step = new ComboBox();
		var send_farm = new CheckBox();
		send_farm.checked = true;
		renderGroup.add(send_farm);
		renderGroup.add(render_step);
		d.add(renderGroup);
		d.addSpace(15);
		send_farm.text = "Adicionar na Fila da Render Farm";
		render_step.itemList = render_steps.sort();
		render_step.label = "RENDER Step: ";
		renderGroup.title = "Opções de RENDER";
		if(render_steps.indexOf(curr_step) != -1){
			render_step.currentItem = curr_step;	
		}
	}
	
	var rc = d.exec();
	if(!rc){
		return false;
	}
	
	options["publish_step"] = publish_steps.length > 1 ? publish_step.currentItem : publish_steps[0];
	options["render_step"] = proj_data["render_farm"] ? render_step.currentItem : null;
	options["send_farm"] = proj_data["render_farm"] ? send_farm.checked : null;
	return options;
}