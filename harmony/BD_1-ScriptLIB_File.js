"use strict";

/*
-------------------------------------------------------------------------------
Name:		BD_1-ScriptLIB_File.js

Description:	Este script armazena a lib de funções relativas a Files e Dir;

Usage:		Usar em outros scripts atraves do include

Author:		Leonardo Bazilio Bentolila

Created:	junho, 2020.
            
Copyright:  leobazao_@Birdo
-------------------------------------------------------------------------------
*/

//#####################JSON files#####################//
/*cria arquivo JSON com objeto e caminho dados como parametro
@objeto => javascript object
@fileName => arquivo json a ser criado
*/

function BD1_WriteJsonFile(objeto, fileName){
	var jsonString = JSON.stringify(objeto, null, 2);
	var file = new File(fileName);
	try {
		file.open(FileAccess.WriteOnly);
		file.write(jsonString);
		file.close();
		MessageLog.trace("JSON File created! " + fileName);
		return true;
	} catch (err){
		Print(err);
	}
	return false;
}

/*le o arquivo JSON e retorna o objeto javascript
@jsonFile => arquivo json a ser covertido
*/
function BD1_ReadJSONFile(json_path){
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

//##################### FOLDERS #####################//
/*Teste se o folder existe
@dirPath => folder a ser testado
*/
function BD1_DirExist(dirPath){
	var dir = new Dir(dirPath);
	return dir.exists;
}

/*Remove a pasta dada como parametro (recursivo)
@dirPath => folder a ser deletado
*/
function BD1_RemoveDirs(dirPath){
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

/*cria diretorio recusivamente 
@dirPath => folder a ser criado
*/
function BD1_makeDir(dirPath){
	var myDir = new Dir;
	myDir.path = dirPath;
	if(!myDir.exists){
		try {
			myDir.mkdirs(dirPath);
		} catch (e){
			Print(e);
			return false;
		}
		return true;
	}
	return false;
}

/*cria diretorios recusvivamente (feito pra funcionar na rede)
@path => folder a ser criado
*/
function BD1_createDirectoryREDE(path){

	if(path.length == 0){
		return false;
	}

	var save_dir = null;
	var p = path.split("/");
	var sub_path = p[0] + "/";

	//começa em 1 pra evitar tentar criar a raiz do vpn
	for(var i = 1; i < p.length; i++){
		sub_path += p[i] + "/";
		save_dir = new Dir(sub_path);
		if(!save_dir.exists){

			try{
				save_dir.mkdir();
				MessageLog.trace("directory created: " + sub_path);
			}
			catch(error){
				MessageLog.trace( error);
				return false;
			}
		}
	}
	return true;
} 
/*Lista o folder dado ignorando os . .. no output
@main_folder => folder a ser analizado para listar folders
*/
function BD1_ListFolders(main_folder){
	var dir = new Dir;
	dir.path = main_folder;
	var folderList = dir.entryList("*", 1, 4);
	folderList.shift();
	folderList.shift();
	return folderList;
}

/*lista todos itens dentro do folder recursivamente, e retorna lista de fullPaths dos arquivos/dirs
@rootFolder => caminho do folder para listar conteudo
*/
function BD1_ListFolderRecursivelly(rootFolder){
	var finalList = [];
	
	listRecursively(rootFolder);

	function listRecursively(mainFolder){
		var dir = new Dir;
		dir.path = mainFolder;
		var contentList = dir.entryList("*", 3, 4).filter(function(x){ return x != "." && x != ".."});
		for(var i=0; i<contentList.length; i++){
			var fullPath = dir.filePath(contentList[i]);
			finalList.push(fullPath);
			if(!BD1_is_file(fullPath)){
				listRecursively(fullPath);
			}
		}
	}
	return finalList;
}

/*se for mac, pega o caminho e bota aspas nele ""
@path => caminho a ser analizado
*/	
function BD1_addScapeForMac(path){
	if(about.isWindowsArch()){
		var wScape = "\"\"" + path + "\"\"";
		return wScape;
	}
	return path;
}

/*se for Windows troca as "/" por "\\"
@path => caminho pra trocar
DEPRECIATED => usar normalize function instead!!!!
*/	
function BD1_doubleBackSlash_forWindows(path){
	if(about.isWindowsArch()){
		path = path.replace(/\//g, "\\\\");
		return path;
	}
	return path;
}	
/*se for Windows troca as "/" por "\\"
	@path => caminho pra trocar
	@os_force => bool pra determinar se forca o OS (se for windows usa o \\ pra separar)
*/	
function BD1_normalize_path(path, os_force){
	var os_bar = os_force && about.isWindowsArch() ? "\\" : "/";
	var regex_bars = /\/|\\/;//gets both fowardslash bars and backslash
	return path.split(regex_bars).join(os_bar);
}

/*
	abre o caminho no explorer
*/
function BD1_OpenFolder(path){
	if(!BD1_DirExist(path)){
		Print("Open folder error! folder nao existe : " + path);
		return false;
	} 
	var process = null;
	var folderPath = fileMapper.toNativePath(path);
	if(about.isWindowsArch()){
		var command = System.getenv("windir") + "/explorer.exe";
		process = new Process2(fileMapper.toNativePath(command), folderPath);
	} else if(about.isMacArch()){
		process = new Process2("open", folderPath);
	}

	if(!process){
		MessageBox.warning("Open folder not suported for this OS!", 0,0);
		return false;
	}
	var ret = process.launch();// let's home this worked.
	Print(ret);
	if(ret != 1){
		MessageBox.information("Erro ao tentar abrir folder: " + folderPath);
		return false;
	}
	Print("Folder opened: " + folderPath);
	return true;
}

//#####################GENERAL files#####################//
function BD1_fileBasename(filePath){//retorna o nome do arquivo com extensao
	var file = new File(filePath);
	if(file.extension){
		return file.baseName + "." + file.extension;
	} else {
		return file.baseName;
	}
}	

function BD1_file_extension(filePath){//retorna a extensao do arquivo
	var file = new File(filePath);
	return file.extension;
}

function BD1_dirname(path){//retorna o parent folder do arquivo
	var file = new File(path);
	return file.path;
}	

function BD1_fileParentFolder(filePath){//(obsoleto - rever os scripts q usam pra mudar pra outro nome : dirname)
	var file = new File(filePath);
	return file.path;
}
/*Le o arquivo dado como parametro e retorna seu conteudo em texto
@file => arquivo de texto
*/
function BD1_ReadFile(file){
	var f = new File(file);
	f.open(FileAccess.ReadOnly);
	var text = f.read();
	f.close();
	return text;
}

/*checa se o caminho e de um arquivo (se for dir ou nao existir, retorna false)
@fileToCheck => caminho do arquivo a ser checado
*/
function BD1_is_file(fileToCheck) { 
	var tempFile = new QFileInfo(fileToCheck);
	return tempFile.isFile();
}

/*checha se o arquivo dado existe
@filePath => arquivo a ser verificado
*/
function BD1_FileExists(filePath){
var f = new File(filePath);
return f.exists;
}

/*deleta o Arquivo dado
@filePath => arquivo a ser deletado
*/
function BD1_RemoveFile(filePath) {
	var f = new PermanentFile(filePath);
	var remove = f.remove();
	if(!remove){
		MessageLog.trace("Fail to remove file: " + filePath);
	} else {
		MessageLog.trace("File removed: " + filePath);
	}
	return remove ;
}

/*Copia um arquivo para o caminho especificado
@copyPath => arquivo a ser copiado => Origem;
@pastePath => destino do arquivo => destino;	
*/
function BD1_CopyFile(copyPath, pastePath){//Copia um Arquivo para o caminho dado
	var fileToCopy = new PermanentFile(copyPath);
	var copyOfFile = new PermanentFile(pastePath);
	try {
		var copy = fileToCopy.copy(copyOfFile);
		if(!copy){
			Print("[COPYFILE][ERROR] Fail to copy the file: \n from: " + copyPath + "\n to: " + pastePath);
		} else {
			if(!BD1_CompareFileSize(copyPath, pastePath)){
				Print("[COPYFILE][ERROR] Copy fail! Size is not the same of origin: " + pastePath);
				return false;
			}
			Print("[COPYFILE] File: '" + pastePath + "' Copied!");
		}
	} catch (e) {
		Print(e);
	}
	return copy;
}

function BD1_CompareFileSize(filePath1, filePath2){
	var size1 = new QFileInfo(filePath1).size();
	var size2 = new QFileInfo(filePath2).size();
	return size1 == size2;
}

/*Lista os arquivos no folder dado
@path => folder pra listar os arquivos
@filter => filtro do tipo de arquivo ("*") para listar todos... ex ("*.psd");
*/	
function BD1_ListFiles(path, filter){
	if(!BD1_FileExists(path)){
		Print("[LISTFILES] ERROR! Path does not exist: " + path);
		return false;
	}
	var dir = new Dir(path);
	var files = dir.entryList(filter).sort();
	return files.filter(function isTrash(value) {return value != "." && value != ".."});
}

/*importa audio para cena
@filename => audio file para ser importado na cena
*/	
function BD1_Import_sound(filename, column_name){
	column.add(column_name, "SOUND");
	result = column.importSound(column_name, 1, filename);
	if(!result){
		MessageLog.trace("fail to import sound.. " + filename);
	} else {
		MessageLog.trace("Sound importated: " + filename);
	}
	return result;
}

/*retorna data de modificacao do arquivo
	@filePath
*/
function BD1_get_last_modified(file){
	var file = new File(file);
	file.open(FileAccess.ReadOnly);
	var lmodified = file.lastModified;
	file.close();
	return lmodified;
}
/*renomeia o arquivo para new_name
	@filePath
*/
function BD1_rename_file(filePath, new_name){
	var file = new QFile(filePath);
	if(file.rename(new_name)){
		Print("File : " + filePath + " renamed to : " + new_name);
		return true;
	} else {
		Print("Error renaming file : " + filePath + " to : " + new_name);
		return false;
	}
}
//#####################ZIP files#####################//
/*Cria um zip do arquivo dado no caminho de destino dado
@src_file => arquivo para ser compactado
@zipName => nome do arquivo zip a ser gerado
@dstPath => folder de destino a ser salvo o zip (nao use "/" no fim da string)
*/	
function BD1_ZipFile(src_file, zipName, dstPath){
	if(!BD1_DirExist(src_file)){
		MessageBox.information("ZipFile: Falha ao encontrar arquivo de Origem: " + src_file);
		return false;
	}

	if(!BD1_DirExist(dstPath)){
		MessageBox.information("ZipFile: Falha ao encontrar diretorio de destino: " + dstPath);
		return false;
	}

	var zipper = BD1_Find7Zip();
	var zipFile = dstPath + "/" + zipName + ".zip";

	System.processOneEvent();

	var process = new Process2(zipper, "a", "-tzip", BD1_addScapeForMac(zipFile), BD1_addScapeForMac(src_file));
	var ret = process.launch();// let's home this worked.
	if(ret != 0){
		MessageBox.information("Erro ao comprimir arquivo: " + zipFile);
		return false;
	} else {
		return zipFile;
	}
}

/*Cria um zip de todos arquivos e folders dentro do folder dado
@src_folder => folder para ter os arquivos dentro zipados
@zipName => nome do arquivo zip a ser gerado
@dstPath => folder de destino a ser salvo o zip (nao use "/" no fim da string)
*/	
function BD2_ZipFilesInFolder(src_folder, zipName, dstPath){
	MessageLog.trace("Zipping files in folder..." + src_folder);

	src_folder += "/*";  //*/ 
	var zip_to = dstPath +"/" + zipName +".zip";

	var cmd = BD1_Find7Zip();
	var cmd_args = [cmd, "a", zip_to, src_folder];	

	try{
		Process.execute(cmd_args);
	}
	catch(e){
		MessageLog.trace(e);
		return false;
	}

	return zip_to;
}


/*UNZip arquivo no caminho dado
@zipFile => arquivo zip para ser descompactado
@destiny => destino dos arquivos descompatados do zip
*/	
function BD1_UnzipFile(zipFile, destiny){
	var command = BD1_Find7Zip();
	var commandArguments = [command, "x", zipFile, "-o" + destiny, "-aoa"];
	try {
		Process.execute(commandArguments);
	} catch (err){
		MessageBox.warning( "Error while unziping File: " + zipFile, 1, 0, 0);
		return false;
	}
	MessageLog.trace("Arquivo descompactado com sucesso! " + zipFile + " no destino: " + destiny);
	return true;
}

/* 
find 7zip binary - used to zip template
*/	
function BD1_Find7Zip() {
	var p;
	if(about.isMacArch() || about.isLinuxArch()){
		p = specialFolders.bin + "/bin_3rdParty/7za";
		if(BD1_FileExists(p)){
			return p;
		}
		p = specialFolders.bin + "/../../external/macosx/p7zip/7za";
		if(BD1_FileExists(p)){
			return p;
		}
	} else if (about.isWindowsArch()){
		p = specialFolders.bin + "/bin_3rdParty/7z.exe";
		if(BD1_FileExists(p)){
			return p;
		}
	}
	MessageBox.information("cannot find 7zip to compress template. aborting");
	return false;	
}

//##################### FFMPEG #####################//
/* 
acha o executavel do ffmpeg no birdoApp
@birdoAPP_root - caminho do birdoApp Root (pegar com o objetc to projeto)
*/
function BD1_Get_ffmpeg(birdoAPP_root){
	if(about.isMacArch()){
		return birdoAPP_root + "extra/ffmpeg/mac/bin/ffmpeg";
	} else if(about.isWindowsArch()){
		return birdoAPP_root + "extra/ffmpeg/windows/bin/ffmpeg.exe";
	}
	return false;
}

/* 
converte o arquivo de video dado para uma seq de imagens no output folder tmb dado
@input_file - arquivo de video a ser convertido
@outPutFolder - folder de saida das imagens
*/
function BD1_convert_mov_to_images(birdoAPP_root, input_file, outPutFolder, extension){
	var pythonPath = BD2_FormatPathOS(birdoAppRoot + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(birdoAppRoot + "app/utils/harmony_ffmpeg.py");
	var start = Process2(pythonPath, pyFile, "mov2img", "-i", input_file, "-f", extension, "-o", outPutFolder);
	var ret = start.launch();

	if(ret != 0){
		Print("[BIRDOAPP] falha ao rodar o script de ffmpeg no python!");
		return false; 
	}

	Print("[BIRDOAPP] imagens geradas no folder: " + outPutFolder);
	return true;
}

/*
Compressao basica usando ffmpeg (retirada do shotgun) do render para upload
@birdoAppRoot - root do birdoApp
@input_file - arquivo para ser convertido
@output_file - saida do arquivo
*/
function BD1_CompressMovieFile(birdoAppRoot, input_file, output_file){
	var pythonPath = BD2_FormatPathOS(birdoAppRoot + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(birdoAppRoot + "app/utils/harmony_ffmpeg.py");
	var start = Process2(pythonPath, pyFile, "compress", "-i", input_file, "-o", output_file);
	var ret = start.launch();

	if(ret != 0){
		Print("[BIRDOAPP] falha ao rodar o script de ffmpeg no python!");
		return false; 
	}
	if(BD1_FileExists(output_file)){
		Print("[BIRDOAPP] movie comprimido: " + output_file);
		return true;
	}
	Print("[BIRDOAPP] erro ao gerar o movie: " + output_file);
	return false;
}

/*
comprime uma seq de imagens em um mov
@birdoAppRoot - root do birdoApp
@startFrame - frame de inicio
@imagePatern - padrao de imagem para achar (usar modo: fullpath/Name_%04d.png como padrao)
@duration - duracao em frames do mov
@fps - frame rate do mov
@input_file - arquivo para ser convertido
@output_file - saida do arquivo
*/
function BD1_MakeMovieFromImageSeq(birdoAppRoot, imagePatern, fps, audio_file, output_file){
	var pythonPath = BD2_FormatPathOS(birdoAppRoot + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(birdoAppRoot + "app/utils/harmony_ffmpeg.py");
	if(!BD1_FileExists(audio_file)){
		audio_file = "null";
	}
	var start = Process2(pythonPath, pyFile, "img2mov", "-i", imagePatern, "-fps", fps, "-a", audio_file, "-o", output_file);
	var ret = start.launch();

	if(ret != 0){
		Print("[BIRDOAPP] falha ao rodar o script de ffmpeg no python!");
		return false; 
	}
	Print("[BIRDOAPP] movie criado " + output_file);
	return true;
}

/*
extract audio from movie file
@birdoAppRoot - root do birdoApp
@movie - arquivo de video de origem
@outputFile - saida do arquivo em audio
*/
function BD1_extract_audio_from_movieFile(birdoAppRoot, movie, output_file){
	var pythonPath = BD2_FormatPathOS(birdoAppRoot + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(birdoAppRoot + "app/utils/harmony_ffmpeg.py");
	var start = Process2(pythonPath, pyFile, "extract_audio", "-i", movie, "-o", output_file);
	var ret = start.launch();

	if(ret != 0){
		Print("[BIRDOAPP] falha ao rodar o script de ffmpeg no python!");
		return false; 
	}
	if(BD1_FileExists(output_file)){
		Print("[BIRDOAPP] movie criado " + output_file);
		return true;
	}
	Print("[BIRDOAPP] erro ao gerar o movie: " + output_file);
	return false;
}

/*
comprime uma seq de imagens em um mov
@birdoAppRoot - root do birdoApp
@imagePatern - padrao de imagem para achar (usar modo: fullpath/Name_%04d.png como padrao)
@fps - frame rate do mov
@res_x - resolution x output
@res_y - resolution y output
@output_file - saida do arquivo
*/
function BD1_CreateGIF(birdoAppRoot, imagePatern, fps, res_x, res_y, output_file){
	var pythonPath = BD2_FormatPathOS(birdoAppRoot + "venv/Scripts/python");
	var pyFile = BD2_FormatPathOS(birdoAppRoot + "app/utils/harmony_ffmpeg.py");
	var start = Process2(pythonPath, pyFile, "gif", "-i", imagePatern, "-fps", fps, "-x", res_x, "-y", res_y, "-o", output_file);
	var ret = start.launch();

	if(ret != 0){
		Print("[BIRDOAPP] falha ao rodar o script de ffmpeg no python!");
		return false; 
	}
	Print("[BIRDOAPP] GIF criado " + output_file);
	return true;
}

//UTRANSFORM
/*
convert tvg image to png (thumbnail size) using Utransform
@imputTvgImage - imput tvg to convert
@outputPng - output png file
*/
function BD1_convertTVGtoPNGThumbnail(imputTvgImage, outputPng){
	var utransform = specialFolders.bin + "/utransform.exe";
	var format = "PNG4";
	var process = new Process2(utransform, "-outformat", format, "-outfile", outputPng, "-align", "AUTO_ALIGN", "-resolution", 96, 96, imputTvgImage);
	var ret = process.launch();

	if(ret != 0){
		Print("Error converting tvg into png: " + imputTvgImage);
		return false;
	} else {
		Print("PNG converted: " + outputPng);
		return true;
	}
}

/*
convert tvg image BACK to png image
@imputTvgImage - imput tvg to convert
@outputPng - output png file
*/
function BD1_convertTVGtoPNGANIMATIC(imputTvgImage, outputPng){
	var utransform = specialFolders.bin + "/utransform.exe";
	var format = "PNG";
	if(outputPng == undefined){
		var process = new Process2(utransform, "-outformat", format, "-align", "AUTO_ALIGN", "-margin", 0, imputTvgImage);
		var out = imputTvgImage.replace(".tvg", ".png");
	} else {
		var process = new Process2(utransform, "-outformat", format, "-outfile", outputPng, "-align", "AUTO_ALIGN", "-margin", 0, imputTvgImage);
		var out = outputPng;
	}
	var ret = process.launch();

	if(ret != 0){
		Print("Error converting tvg into png: " + imputTvgImage);
		return false;
	} else {
		Print("PNG converted: " + out);
		return true;
	}
}

/*
	sleep command for sec 
*/
function BD1_sleep(sec){
	System.processOneEvent();
	Print("sleeping for " + sec + " secconds...");
	var process = new Process2("timeout", sec);
	process.launch();
	Print("sleep end!");
}

/*
	ensure the folder is clean and exists (delete and cretate it again to make sure is empty)
*/
function BD1_CleanFolder(folderPath){
	if(BD1_DirExist(folderPath)){
		if(!BD1_RemoveDirs(folderPath)){
			Print("fail to clean folder: " + folderPath);
			return false;
		}
	}
	return BD1_createDirectoryREDE(folderPath);
}	

/*
	forca a criacao do folder (caso ja exista um folder com o mesmo nome, cria um nome novo com um sufixo de numero _1)
*/
function BD1_ForceMakeDir(dirPath){
	var folder = dirPath;
	var index = 1;
	while (index < 100){
		if(BD1_DirExist(folder)){
			folder = dirPath + "_" + ("00" + index).slice(-2);
			index++;
			continue;
		} else {
			BD1_createDirectoryREDE(folder);
			return folder;
		}		
	}
	return false;
}


/*
	Cria um objeto Python para ser usado no js do Harmony;
*/
function BD1_GetPythonObject(){
	try{
		var pyObjects = PythonManager.getPyObjects();
		if("birdoAppScripts" in pyObjects){
			Print("[BIRDOAPP] Python Object loaded!");
			Print("[BIRDOAPP] - has object 'birdoapp_root': " + pyObjects["birdoAppScripts"].hasObject('birdoapp_root'));
			Print("[BIRDOAPP] - has object 'messageLog': " + pyObjects["birdoAppScripts"].hasObject('messageLog'));
			return pyObjects["birdoAppScripts"].py;			
		}
		Print("[BIRDOAPP] Nao foi possivel encontrar o objeto python 'birdoAppScripts' da birdo!");
		return null;
	} catch (e){
		Print(e);
		return null;
	}
}