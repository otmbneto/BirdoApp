include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


BAT_ImportAnimatic();

function BAT_ImportAnimatic(){

	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}

	if(projectDATA.entity.type != "SHOT"){
		Print("[PUBLISH] Error! Script de publish por enquanto somente funciona para shot!");
		return false;
	}

	var update_animatic = false;
	var movie_file = getAnimaticMovie(projectDATA);
	if(!BD1_FileExists(movie_file) || !movie_file){
		Print("Erro: Animatic nao encontrado!");
		return;
	}

	var animaticPath = "Top/ANIMATIC_";
	var portIn = animaticPath + "/Multi-Port-In";
	var comp = getGroupComposite(animaticPath, 0);
	var old_animatic = getAnimaticNode(animaticPath);
	
	var extension = "png";

	if(node.getName(animaticPath) == ""){
		Print("Grupo do animatic nao encontrado!");
		return false;
	}

	if(old_animatic == "abort"){
		return;
	}

	if(node.getName(old_animatic) != ""){//checa se ja existe um animatic na cena
		deleteOldAnimatic(old_animatic);
		update_animatic = true;
	}

	var temp_folder = convert_movie(projectDATA, movie_file, extension)// cretae temp folder with files

	if(!temp_folder){
		return;
	}

	var audio_file = temp_folder + "Animatic.wav";

	var up = updateAudio(audio_file);//deleta os audios da cena
	if(!up){
		Print("falha ao criar o audio para a cena!");
	}

	var animatic = create_animatic_node(temp_folder, extension, animaticPath, update_animatic);

	if(node.getName(animatic) == "" || !animatic){
		Print("Falha ao importar o animatic!");
	} else {
		node.link(animatic, 0, comp, 0);
		node.link(portIn, 0, animatic, 0, false, false);
		node.setTextAttr(animatic, "OFFSET.X", 1, -4);
		node.setLocked(animatic, true);
		
		Print("Animatic Importado com sucesso! Confira a duracao na timeline!");
	}
	
	cleanCache();
	
}


////////////FUNCOES EXTRAS////////////////////////
function getGroupComposite(group, port){
	var multiout = node.getGroupOutputModule(group, "Multi-Port-Out", 0,0,0);
	var next = node.srcNode(multiout, port);
	while(next != ""){
		if(node.type(next) == "COMPOSITE"){
			return next;
		}
		next = node.srcNode(next, port);
	}
	return null;
}

function deleteOldAnimatic(animaticPath){//deleta o animatic antigo e seus audios!
	var del = node.deleteNode(animaticPath, true, true);
	Print("animatic deleted: " + del);
	return del;
}

function getAnimaticNode(animGroup){//verifica se ha algum animatic na cena e retorna ele
	var subs = node.subNodes(animGroup);
	var listRead = [];
	for(var i=0; i<subs.length; i++){
		if(node.type(subs[i]) == "READ"){
			listRead.push(subs[i]);
		}			
	}
	if(listRead.length >1){
		Print("Esta cena contem mais de um animatic dentro do grupo 'ANIMATIC_'! Delete os animatics antigos na mao antes de importar o Animatic novo!");
		return "abort";
	} else {
		return listRead[0];
	}
}

function create_animatic_node(image_folder, extension, parent, update_animatic){//cria um node de animatic com a sequencia de imagens convertidas

	if(parent === undefined){
		parent = node.root();
	}

 	var name = "Animatic";
	var elemId = element.add(name, "COLOR", scene.numberOfUnitsZ(), extension.toUpperCase(), 0);
	if(elemId == -1){
		Print("falha ao criar elemento!");
  		return null; // no read to add.
	}

	var uniqueColumnName = BD2_getUniqueColumnName(name);
	column.add(uniqueColumnName , "DRAWING");
	column.setElementIdOfDrawing( uniqueColumnName, elemId );

	var read = node.add(parent, name, "READ", 0, 0, 0);
	
	node.linkAttr(read, "DRAWING.ELEMENT", uniqueColumnName);

	var image_list =  BD1_ListFiles(image_folder, "*.png");

	var image_count = image_list.length;

	if(image_count == 0){
		Print("Falha ao encontrar imagens png!");
		return false;
	}

	if(!update_animatic){
		frame.insert(1, (image_count - 1));
	}

	for(var i = 0; i <image_count; i++){
		var timing = (1+i).toString();
		var image_path = image_folder + image_list[i]; 
		Print("importing image: " + image_path);

		Drawing.create(elemId, timing, true); // create a drawing drawing, 'true' indicate that the file exists.
		var drawingFilePath = Drawing.filename(elemId, timing);   // get the actual path, in tmp folder.

		BD1_CopyFile( image_path, drawingFilePath );
		column.setEntry(uniqueColumnName, 1, timing, timing);
	}

	return read; // name of the new drawing layer.
}


function updateAudio(audio_file){//copia o arquivo de audio para o audio da cena, se nao tiver somente importa o novo
	var scene_audio_folder = scene.currentProjectPath() + "/audio/";
	var sounds_columns = column.getColumnListOfType("SOUND");
	if(sounds_columns.length > 0){
		var copy_file = true;
		for(var i=0; i<sounds_columns.length;i++){
			var soundFile = scene_audio_folder + column.getEntry(sounds_columns[i], 1, 1);
			if(!sound.copy(audio_file, soundFile)){
				copy_file = false;
				Print("falha ao copiar arquivo de audio: " + soundFile);
			} else {
				Print("falha ao copiar arquivo de audio: " + soundFile);
			}
		}
		return copy_file;
	} else {
		var column_name = BD2_getUniqueColumnName("Animatic_audio");
		var audio_import = BD1_Import_sound(audio_file, column_name);
		Print("audio import " + column_name + " : " + audio_import);
		return audio_import;
	}
}


function cleanCache(){//Limpa o cache criado no temp com as imagens geradas

	var temp_folder = specialFolders.temp;
	var regex_columName = /(ATV-\w{16})$/;// regex pra achar os nomes de coluna criado e ficaram de sujeira do importAnimatic do Shotgun
	var list_folders = BD1_ListFolders(temp_folder);
	var count = 0;

	for(var i=0; i<list_folders.length; i++){
		if(regex_columName.test(list_folders[i])){
			var to_delete = temp_folder + "/" + list_folders[i];
			Print("trash found: " + list_folders[i]);
			if(BD1_RemoveDirs(to_delete)){
				count++;
			}
		}
	}

	Print("Cache limpo!! " + count + " pastas foram deletadas!");
}


function convert_movie(projectDATA, movieFile, extension){//converte o aruquivo e retorna o folder com as imagens
	var pos = movieFile.lastIndexOf( "." );
	if(pos < 0){
		Print("error: invalid mov file: " + movieFile);
		return null;
	}

	var image_folder = specialFolders.temp + "/" + column.generateAnonymousName()+"/";
	BD1_makeDir(image_folder);

	var audio_file = image_folder + "Animatic.wav";

	Print("converting movie to image sequence... ");

	var convertImages = BD1_convert_mov_to_images(projectDATA.birdoApp, movieFile, image_folder, extension);

	if(!convertImages){
		return false;
	} 

	Print("extracting audio from movie... ");

	var extractAudio = BD1_extract_audio_from_movieFile(projectDATA.birdoApp, movieFile, audio_file);

	if(!extractAudio){
		return false;
	}

	return image_folder;

}

function getAnimaticMovie(projectDATA){//retorna o caminho pro animatic da cena
	var cena = scene.currentScene();
	var regexCena = /^(\w{3}_EP\d{3}_SC\d{4})$/;

	if(!regexCena.test(cena)){
		Print("nome da cena fora do padrao!");
		return false;
	}
	var ep = cena.split("_")[1];
	var moviePath = projectDATA.getRenderAnimaticLocalFolder();
	
	if(!moviePath){
		Print("Local animatic folder not found!");
		return false;
	}
	
	var all_movs = BD1_ListFiles(moviePath, "*.mov");
	if(all_movs.length == 0){
		return false;
	}

	var scene_acnimatics = all_movs.filter(function(x) { return x.indexOf(cena) != -1}); 
	if(scene_acnimatics.length == 0){
		return false;
	}
	return moviePath + scene_acnimatics[scene_acnimatics.length -1];
}
