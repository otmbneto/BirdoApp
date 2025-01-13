/* v02 update de lista de ignorados
-------------------------------------------------------------------------------
Name:		compact_version_bat.js

Description: Scritp e uma versao do compact list pra rodar em bat e gera um json na saida da pasta (para fins de ser usado no publish events)

Usage:		Usar como bat pra gerar saida em json da lista de arquivos usados na versao

Author:		Leonardo Bazilio Bentolila

Created:	fevereiro, 2022
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

compact_version_bat();

function compact_version_bat(){

	fix_cagada_version();

	//LISTAR TRATAMENTO DE ARQUIVOS AQUI////
	var main_folders = ["audio", "elements", "frames", "palette-library", "scripts"];
	var files_ext_list = ["xstage", "aux", "elementTable", "versionTable"];
	var file_list = ["PALETTE_LIST"];
	var elements_ext_exeption_list = ["tga"];//extencoes de arquivos dos elements para NAO adicionar
	///////////////////////////////////////

	var cenaPath = scene.currentProjectPath();
	var versionName = scene.currentVersionName();
	var sceneName = scene.currentScene();
	var cenaDir = BD1_dirname(cenaPath);//caminho do folder parent da cena

	var all_files = BD1_ListFiles(cenaPath, "*").filter(validate_main_item);
	var counter_file = 0;
	
	var finalOutput = {"user_name": null, "file_list": []};

	var mainFolderItem = {"full_path": cenaPath, "relative_path": cenaPath.replace(cenaDir, "")};
	finalOutput["file_list"].push(mainFolderItem);
	Print("Main folder added to list: " + cenaPath);
	counter_file++;


	for(var i=0; i<all_files.length; i++){
		Print("Listing Scene Files:\n" + all_files[i]);
		var file_path = cenaPath + "/" + all_files[i];
		Print(">>>CHECKING FILE: " + file_path);
		if(all_files[i] == "elements" && !BD1_is_file(file_path)) {
			var elementRootItem = {"full_path": file_path, "relative_path": file_path.replace(cenaDir, "")};
			finalOutput["file_list"].push(elementRootItem);
			Print("file added to list: " + file_path);
			counter_file++;
			list_used_elements();
			continue;
		}

        if(all_files[i] == "frames" && !BD1_is_file(file_path)) {
			var framesItem = {"full_path": file_path, "relative_path": file_path.replace(cenaDir, "")};
            finalOutput["file_list"].push(framesItem);
			Print("file added to list: " + file_path);
			counter_file++;
            continue;
        }

        if(BD1_is_file(file_path)) {
            update_filelist(file_path);
            counter_file++;
        }else{
			var folderItem = {"full_path": file_path, "relative_path": file_path.replace(cenaDir, "")};
            finalOutput["file_list"].push(folderItem);
			Print("file added to list: " + file_path);
            addFolderContentToFinalList(file_path);
			counter_file++;
		}
    }

    Print("COMPACT VERSION LIST DONE! " + counter_file + " arquivos adicionados a lista para compactar no python!");
	var json_output = [cenaPath, "_compact_version_list.json"].join("/"); 
	BD1_WriteJsonFile(finalOutput, json_output);

 /////////////// funcoes complementares - limpa cena////////////////////
	function validate_main_item(item){//valida se o arquivo no folder principal e valido
		var file_extension = BD1_file_extension(item);
		if(file_extension == "aux" || file_extension == "xstage"){
			return item.indexOf(versionName + ".") != -1;
		}
		var is_ext_ok = files_ext_list.indexOf(file_extension) != -1;
		var is_folder_ok = main_folders.indexOf(item) != -1;
		var is_valid_file = file_list.indexOf(item) != -1;
		return is_ext_ok || is_folder_ok || is_valid_file;
	}
	
	function validate_element_file(filePath){//valida se o arquivo dentro de element e valido
		var file_exists = BD1_FileExists(filePath);
		var is_exeption = elements_ext_exeption_list.indexOf(BD1_file_extension(filePath)) == -1;
		return file_exists && is_exeption;
	}
	
    function list_used_elements() {//lista elementos usados na versao
		var elementList = [];
        var readList = node.getNodes(["READ"]);
		var msg = "Listing Scene Files: elements: ";
        for(var i=0; i<readList.length; i++){
			Print(msg + "[" + i + "/" + readList.length + "]");
            var id = node.getElementId(readList[i]);
            var folder = BD2_updateUserNameInPath(element.completeFolder(id));
			if(elementList.indexOf(folder) != -1){
				continue;
			}
			var elementItem = {"full_path": folder, "relative_path": folder.replace(cenaDir, "")};
            finalOutput["file_list"].push(elementItem);
			Print("file added to list: " + folder);
            addFolderContentToFinalList(folder);
			elementList.push(folder);
			counter_file++;
        }
		Print("Number of elements used in scene: " + elementList.length);
    }

    function update_filelist(filePath) { //adiciona o arquivo la lista final
		var item = {"full_path": filePath, "relative_path": filePath.replace(cenaDir, "")};
		var placeHolderName = item["relative_path"].replace(versionName, "{PLACE_HOLDER}");
		item["relative_path"] = placeHolderName;
        finalOutput["file_list"].push(item);
    }

	function addFolderContentToFinalList(folder){//adiciona todos intens do folder ao finalOutput list
		var content_list = BD1_ListFolderRecursivelly(folder).filter(validate_element_file);

		for(var i=0; i<content_list.length; i++){
			var item = {"full_path": content_list[i], "relative_path": content_list[i].replace(cenaDir, "")};
			finalOutput["file_list"].push(item);
			Print("file added to list: " + content_list[i]);
			counter_file++;
		}
	}
	
	function fix_cagada_version(){//funcao pra corrigir a burrada do publish do mac q gerou arquivos de versoes com .zip e .rar no nome
		var versionName = scene.currentVersionName();
		var regex_ziprar = /(\.zip|\.rar)/;
		if(regex_ziprar.test(versionName)){
			Print("sceneversion needs corrections...");
			var newVersionName = versionName.replace(regex_ziprar, "_TEMP");
			Print("saving as: " + newVersionName);
			scene.saveAsNewVersion(newVersionName, true);
		}
	}
}
