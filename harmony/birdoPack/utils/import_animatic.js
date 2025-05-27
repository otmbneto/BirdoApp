/*
	Utils do update Animatic;
	(usar no modo BATCH e no scrit do Menu!);
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function Animatic(proj_data, verbose){
	
	//verbose (se false nao mostra nenhuma interface - para rodar no modo batch)
	this.verbose = verbose
	
	//project data object
	this.proj_data = proj_data;
	
	//folder temporario para salvar as images
	this.temp_folder = [proj_data.systemTempFolder, "BirdoApp", "_animatic"].join("/");
	
	//grupo dos animatics no SETUP
	this.group = "Top/ANIMATIC_";
	
	//animatic node name
	this.node_name = "Animatic_{version}";
	
	//define extenção do arquivo de image
	this.img_format = "png";
	this.audio_format = "wav";
	
	//version reg
	this.version_reg = proj_data.pattern.version;
	
	//define antigo animatic
	this.old_nodes = node.subNodes(this.group).filter(function(item){ return node.type(item) == "READ"});
	this.curr_version = this.old_nodes.length == 1 ? this.version_reg.exec(this.old_nodes[0])[0] : "v00";
	
	//define se vai usar progressbar
	if(this.verbose){
		var mainapp = QApplication.activeWindow();
		this.pb = new QProgressDialog(mainapp);
		this.pb.modal = true;
	} else{
		this.pb = null;
	}
	
	//METHODS
	this.get_next_version = function(){
		var n = parseFloat(this.curr_version.replace("v", "")) + 1;
		return "v" + ("00" + n).slice(-2);
	}	
	
	this.get_temp_files = function(){//define os arquivos gerados pelo script python no folder temp
		if(!path_exists(this.temp_folder)){
			Print("[BIRDOAPP] Nao foi possivel encontrar o folder temp! Algo deu errado!");
			return false;
		}
		var dir = new Dir(this.temp_folder);
		var files = dir.entryList("*")
		
		//define temp images list
		var img_reg = new RegExp("\\." + this.img_format);
		this.image_list = files.filter(function(item) {return img_reg.test(item)}).sort();
		
		//define audio file
		var audio_reg = new RegExp("\\." + this.audio_format);
		var audios = files.filter(function(item) {return audio_reg.test(item)}).sort();
		this.audio_file = audios.length == 0 ? null : this.temp_folder + "/" + audios[0];
		return this.image_list.length > 0;
	}
	
	this.clean_group = function(){//deleta antigos nodes de animatic no grupo
		this.old_nodes.forEach(function(item){ 
			if(node.deleteNode(item, true, true)){
				Print(" - Node deleted: " + item);
			}
		});	
	}
	
	this.clean_temp = function(){//reseta o folder temp (deletando o conteudo e criando novamente o folder vazio
		var dir = new Dir;
		dir.path = this.temp_folder;
		if(dir.exists){
			dir.rmdirs();
		} 
		dir.mkdirs();
		Print("[BIRDOAPP] Animatic Temp Folder resetado!");
	}
	
	this.create_animatic_node = function(){
		
		//limpa os nodes antes de criar o novo;
		this.clean_group();
		
		var name = this.node_name.replace("{version}", this.get_next_version());
		var elemId = element.add(name, "COLOR", scene.numberOfUnitsZ(), this.img_format.toUpperCase(), 0);
		if(elemId == -1){
			Print("[BIRDOAPP] falha ao criar elemento!");
			if(this.verbose){
				MessageBox.warning("ERRO! Falha ao criar o elemento de nome '" + name + "'", 0, 0);
			}
			return false;
		}

		var image_count = this.image_list.length;
		if(image_count == 0){
			Print("[BIRDOAPP] Falha ao encontrar imagens do animatic no temp. Algo deu errado!");
			if(this.verbose){
				MessageBox.warning("ERRO! Nao foram encontrados nenhuma imagem convertida na pasta temp! Algo deu errado!", 0, 0);
			}
			return false;
		}
		
		var uniqueColumnName = getUniqueColumnName(name);
		column.add(uniqueColumnName , "DRAWING");
		column.setElementIdOfDrawing( uniqueColumnName, elemId );

		var read = node.add(this.group, name, "READ", 0, 0, 0);
		node.linkAttr(read, "DRAWING.ELEMENT", uniqueColumnName);

		//checa se precisa incrementar o numero de frames da cena
		var sceneFrameNumber = frame.numberOf();
		if(sceneFrameNumber < image_count){
			Print("frames adicionados: " + (image_count - sceneFrameNumber));
			frame.insert(sceneFrameNumber, (image_count - sceneFrameNumber));
		}
		
		if(this.pb){
			this.pb.setRange(0, image_count-1);
			this.pb.open();
		}
		
		for(var i = 0; i <image_count; i++){
			var timing = (1+i).toString();
			if(this.pb){
				this.pb.setLabelText("Importing Animatic frame: [" + timing + "/" + image_count + "]");
				this.pb.setValue(i);
			}
			var image_path = [this.temp_folder, this.image_list[i]].join("/"); 
			Print("[BIRDOAPP] importing image: " + image_path);
			Drawing.create(elemId, timing, true); // create a drawing drawing, 'true' indicate that the file exists.
			var drawingFilePath = Drawing.filename(elemId, timing);   // get the actual path, in tmp folder.
			if(!drawingFilePath){
				Print("[BIRDOAPP] Erro pegando o caminho do arquivo do elemento no temp folder: " + timing);
				continue;
			}
			copy_file( image_path, drawingFilePath );
			column.setEntry(uniqueColumnName, 1, timing, timing);
		}
		if(this.pb){
			this.pb.close();
		}
		
		var comp = node.subNodes(this.group).filter(function(item){ return node.type(item) == "COMPOSITE"})[0];
		var portIn = this.group + "/Multi-Port-In";
		var create_port = true;
		if(!comp){
			Print("[BIRDOAPP] Nao foi encontrado nenhuma composite!");
			comp = this.group + "/Multi-Port-Out";
			create_port = false;
		}
	
		node.link(read, 0, comp, 0, false, create_port);
		node.link(portIn, 0, read, 0, false, false);
		node.setTextAttr(read, "OFFSET.X", 1, -4);
		node.setLocked(read, true);

		Print("[BIRDOAPP] Node animatic criado com sucesso: " + read);
		return true;
	}
	
	this.update_scene_audio = function(){//deleta as colunas e arquivos de audio da cena e importa o novo

		var scene_audio_folder = scene.currentProjectPath() + "/audio/";
		if(!path_exists(this.audio_file)){
			Print("[BIRDOAPP][UPDATE ANIMATIC] Audio file not found!");
			return false;
		}

		var sounds_columns = column.getColumnListOfType("SOUND");
		if(sounds_columns.length > 0){
			//copy audio file to existing scene audios (maybe duplicate some)
			var copy = true;
			for(var i=0; i<sounds_columns.length;i++){
				var soundFile = scene_audio_folder + column.getEntry(sounds_columns[i], 1, 1);
				if(!sound.copy(this.audio_file, soundFile)){
					copy = false;
					Print("[BIRDOAPP] falha ao copiar arquivo de audio: " + soundFile);
				} else {
					Print("[BIRDOAPP] arquivo de audio copiado: " + soundFile);
				}
			}
			Print("[BIRDOAPP] Audio copy files: " + copy);
			return copy;
		} else {
			//add new audio to scene
			var column_name = getUniqueColumnName("Animatic_audio");
			column.add(column_name, "SOUND");
			var audio_import = column.importSound(column_name, 1, this.audio_file);
			Print("[BIRDOAPP] Animatic audio import " + column_name + " : " + audio_import);
			return audio_import;
		}
	}
	
	this.run_python_script = function(){
		this.clean_temp();
		Print("[BIRDOAPP] Rodando script update animatic em python...");
		try{
			var python = this.proj_data.birdoApp + "venv/Scripts/python.exe";
			var pyFile = this.proj_data.birdoApp + "app/utils/update_animatic.py";
			var scene_name = this.proj_data.entity.name;
			var start = Process2(
				python, 
				pyFile, 
				this.proj_data.id, 
				scene_name, 
				this.get_next_version(), 
				this.img_format, 
				this.audio_format, 
				this.temp_folder
			);
			var ret = start.launch();
			return ret;
		} catch (e){
			Print(e);
			return false;
		}
	}
	
	this.update = function(){//runs update animatic
		var update = true;
		try{
			if(!this.get_temp_files()){
				Print("[ERRROR EXPORTING IMAGE SEQUENCE!]");
				update = false;
			}
			if(!this.create_animatic_node()){
				Print("[ERRROR CREATING ANIMATIC NODE!]");
				update = false;
			}
			if(!this.update_scene_audio()){
				Print("ERROR UPDATING SOUND FILE!");
				update = false;
			}
		} catch(e){
			Print(e);
			update = false;
		}
		if(this.verbose){
			if(!update){
				MessageBox.warning("ALGO DEU ERRADO! Falha ao atualizar o Animaic da cena!", 0, 0);
			} else {
				MessageBox.information("Animatic Importado com sucesso! Confira a duracao na timeline!");
			}
		}
		return update;
	}
	
	//HELPER FUNCTIONS
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
	
	function getUniqueColumnName(column_prefix){
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

	function path_exists(filePath){
		var f = new File(filePath);
		return f.exists;
	}
	
	function copy_file(copyPath, pastePath){//Copia um Arquivo para o caminho dado
		var fileToCopy = new PermanentFile(copyPath);
		var copyOfFile = new PermanentFile(pastePath);
		try {
			var copy = fileToCopy.copy(copyOfFile);
			if(!copy){
				Print("[BIRDOAPP][COPYFILE][ERROR] Fail to copy the file: \n from: " + copyPath + "\n to: " + pastePath);
			} else {
				Print("[BIRDOAPP][COPYFILE] File: '" + pastePath + "' Copied!");
			}
		} catch (e) {
			Print(e);
		}
		return copy;
	}
}
exports.Animatic = Animatic;
