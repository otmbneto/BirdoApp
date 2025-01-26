//VERSAO PROvISORIA

//TODO:
//  - renomear as camadas de audio antigas para _DELETAR ou algo assim ?? checar se isso foi feito
// atualizar funcao getAnimaticMovie() para usar o getProjData() novo
// atualizar todos ffmpeg com o caminho da birdoApp 


function import_animatic(){

	var update_animatic = false;
	var movie_file = getAnimaticMovie();

	if(!fileExists(movie_file)){
		Print("Erro: Animatic nao encontrado!");
		return;
	}

	var animaticPath = "Top/ANIMATIC_";
	var portIn = animaticPath + "/Multi-Port-In";
	var comp = animaticPath + "/Comp_Animatic";
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

	var temp_folder = convert_movie(movie_file, extension)// cretae temp folder with files

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

	var uniqueColumnName = getUniqueColumnName(name);
	column.add(uniqueColumnName , "DRAWING");
	column.setElementIdOfDrawing( uniqueColumnName, elemId );

	var read = node.add(parent, name, "READ", 0, 0, 0);
	
	node.linkAttr(read, "DRAWING.ELEMENT", uniqueColumnName);

	var image_list =  listFiles(image_folder, "*.png");

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

		copyFile( image_path, drawingFilePath );
		column.setEntry(uniqueColumnName, 1, timing, timing);
	}

	return read; // name of the new drawing layer.
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


function import_sound(filename, column_name){
	var frame = 1;
	column.add(column_name, "SOUND");
	result = column.importSound(column_name, frame, filename);
	return result;
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
		var column_name = getUniqueColumnName("Animatic_audio");
		var audio_import = import_sound(audio_file, column_name);
		Print("audio import " + column_name + " : " + audio_import);
		return audio_import;
	}
}

function copyFile(copyPath, pastePath){//Copia um Arquivo para o caminho dado
	var fileToCopy = new PermanentFile(copyPath);
	var copyOfFile = new PermanentFile(pastePath);
	var copy = fileToCopy.copy(copyOfFile);
	if(!copy){
		Print("Fail to copy the file: '" + copyPath + "' to : '" + pastePath + "'!");
	} else { 
		Print("File: '" + pastePath + "' Copied!");
	}
	return copy;
}


function removeFile(fn) {
	var v = new PermanentFile(fn);
	return v.remove();
} 

function cleanCache(){

	var temp_folder = specialFolders.temp;
	var regex_columName = /(ATV-\w{16})$/;// regex pra achar os nomes de coluna criado e ficaram de sujeira do importAnimatic do Shotgun
	var list_folders = listFolders(temp_folder);
	var count = 0;

	for(var i=0; i<list_folders.length; i++){
		if(regex_columName.test(list_folders[i])){
			var to_delete = temp_folder + "/" + list_folders[i];
			Print("trash found: " + list_folders[i]);
			if(removeDirs(to_delete)){
				count++;
			}
		}
	}


	Print("Cache limpo!! " + count + " pastas foram deletadas!");
}

function listFolders(main_folder){
	var dir = new Dir;
	dir.path = main_folder;
	var folderList = dir.entryList("*", 1, 4);
	folderList.shift();
	folderList.shift();
	return folderList;
}


function removeDirs(dirPath){
	var dir = new Dir;
	dir.path = dirPath;
	if(!dir.exists){
		return false;
	}
	dir.rmdirs();
	return true;
}


function listFiles(path, filter){
	var dir = new Dir(path);
	var files = dir.entryList(filter).sort();
	if(filter == "*"){
		files.shift();
		files.shift();
	}
	return files;
}

function fileExists(path){
	var file = new File(path);
	return file.exists;
}

function createDirectory(path){
	var save_dir = new Dir(path);
	if(!save_dir.exists){
		try{
			save_dir.mkdirs();
		}
		catch(error){ 
			Print( error);
			return false;	
		}
	}
	return true;
}

//ATUALIZAR CAMINHO DO FFMPEG
function convert_mov_to_images(movie, outPutFolder, imageFormat){//converte o mov em seq de pngs  no caminho... prefisa do ffmpeg
	var ffmpeg = "C:/ffmpeg/bin/ffmpeg.exe";

	if(!fileExists(ffmpeg)){
		Print("Erro: ffmpeg nao encontrado neste computador!");
		return false;
	}

	var images = outPutFolder + "f-%04d." + imageFormat;

	var process = new Process2(ffmpeg, "-i", movie, "-r", 24, "-s", "480x270", images);
	var ret = process.launch();// let's home this worked.

	if(ret != 0){
		Print("Erro ao converter movie: " + movie);
		return false;
	} else {
		Print("Image sequence from movie converted!");
		return true;
	}
}


function extract_audio(movie, outputFile){//converte o mov para audio (dar nome completo do output file com extencao);
	var ffmpeg = "C:/ffmpeg/bin/ffmpeg.exe";
	if(!fileExists(ffmpeg)){
		Print("Erro: ffmpeg nao encontrado neste computador!");
		return false;
	}

	var process = new Process2(ffmpeg, "-i", movie , outputFile);
	var ret = process.launch();// let's home this worked.

	if(ret != 0){
		Print("Erro ao extrair audio: " + movie);
		return false;
	} else {
		Print("audio extracted!");
		return true;
	}
}



function convert_movie(movieFile, extension){//converte o aruquivo e retorna o folder com as imagens
	var pos = movieFile.lastIndexOf( "." );
	if(pos < 0){
		Print("error: invalid mov file: " + movieFile);
		return null;
	}

	var image_folder = specialFolders.temp + "/" + column.generateAnonymousName()+"/";
	createDirectory(image_folder);

	var audio_file = image_folder + "Animatic.wav";

	Print("converting movie to image sequence... ");

	var convertImages = convert_mov_to_images(movieFile, image_folder, extension);

	if(!convertImages){
		return false;
	} 

	Print("extracting audio from movie... ");

	var extractAudio = extract_audio(movieFile, audio_file);

	if(!extractAudio){
		return false;
	}

	return image_folder;

}

//PRECISA ATUALIZAR PRA USAR O getProjData() do sistema novo
function getAnimaticMovie(){//retorna o caminho pro animatic da cena
	var cena = scene.currentScene();
	var regexCena = /^(MNM_EP\d{3}_SC\d{4})$/;
	if(!regexCena.test(cena)){
		Print("nome da cena fora do padrao!");
		return false;
	}
	var ep = cena.split("_")[1];
	var moviePath = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/MNM_OMeninoMaluquinho/MNM_EPISODES/MNM_"+ ep + "/MNM_" + ep + "_SCENES/RENDER/ANIMATIC/";
	var all_movs = listFiles(moviePath, "*.mov");
	var scene_acnimatics = all_movs.filter(function(x) { return x.indexOf(cena) != -1}); 
	if(scene_acnimatics.length == 0){
		return false;
	}
	return moviePath + scene_acnimatics[scene_acnimatics.length -1];
}


function Print(msg){
	if(typeof msg == "object"){
		var msg = JSON.stringify(msg, null, 2);
	}
	MessageLog.trace(msg);
	System.println(msg);
}