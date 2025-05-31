/* v02 update de lista de ignorados
-------------------------------------------------------------------------------
Name:		compact_version_file.js

Description: Scritp que gera lista de arquivos somente usados na versao aberta do toon boom

Usage:		Usar como require nos scripts

Author:		Leonardo Bazilio Bentolila

Created:	setembro, 2021 - (update janeiro, 2022)
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function create_compact_file_list(use_progressbar){

	//LISTAR TRATAMENTO DE ARQUIVOS AQUI////
	var main_folders = ["audio", "elements", "frames", "palette-library", "scripts"];
	var files_ext_list = ["xstage", "aux", "elementTable", "versionTable"];
	var file_list = ["PALETTE_LIST", "scene.elementTable", "scene.versionTable"];
	var elements_ext_exeption_list = ["tga"];//extencoes de arquivos dos elements para NAO adicionar
	///////////////////////////////////////

	var cenaPath = scene.currentProjectPath();
	var versionName = scene.currentVersionName() + ".";
	var sceneName = scene.currentScene();
	var cenaDir = BD1_dirname(cenaPath);//caminho do folder parent da cena

	var all_files = BD1_ListFiles(cenaPath, "*").filter(validate_main_item);
	var counter_file = 0;
	
	var finalOutput = {"user_name": null, "file_list": []};
	
	if(use_progressbar){
		var progressDlg = new QProgressDialog();
		progressDlg.setStyleSheet(progressDlg_style);
		progressDlg.modal = true;
		progressDlg.open();
		progressDlg.setRange(0, all_files.length - 1);
	}
	
	var mainFolderItem = {"full_path": cenaPath, "relative_path": cenaPath.replace(cenaDir, "")};
	finalOutput["file_list"].push(mainFolderItem);
	Print("Main folder added to list: " + cenaPath);
	counter_file++;

	for(var i=0; i<all_files.length; i++){
		if(use_progressbar){
			progressDlg.setLabelText("Listing Scene Files: [" + i + "/" + all_files.length + "]");
			progressDlg.setValue(i);
		}
		
		//fullpath of file
		var file_path = cenaPath + "/" + all_files[i];
		
		//add elements filtering usage in scene version
		if(all_files[i] == "elements" && !BD1_is_file(file_path)) {
			var elementRootItem = {"full_path": file_path, "relative_path": file_path.replace(cenaDir, "")};
			finalOutput["file_list"].push(elementRootItem);
			counter_file++;
			list_used_elements();
			continue;
		}

        if(all_files[i] == "frames" && !BD1_is_file(file_path)) {
			var framesItem = {"full_path": file_path, "relative_path": file_path.replace(cenaDir, "")};
            finalOutput["file_list"].push(framesItem);
			counter_file++;
            continue;
        }

        if(BD1_is_file(file_path)) {
            update_filelist(file_path);
            counter_file++;
        }else{
			var folderItem = {"full_path": file_path, "relative_path": file_path.replace(cenaDir, "")};
            finalOutput["file_list"].push(folderItem);
            addFolderContentToFinalList(file_path, false);
			counter_file++;
		}
    }

	if(use_progressbar){
		progressDlg.close();
	}
	
    Print(counter_file + " arquivos adicionados a lista de arquivos usados na cena!");
	return finalOutput;

 /////////////// funcoes complementares - limpa cena////////////////////
	function validate_main_item(item){//valida se o arquivo no folder principal e valido
		var file_extension = BD1_file_extension(item);
		if(file_extension == "aux" || file_extension == "xstage"){
			return item.indexOf(versionName) != -1;
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
			if(use_progressbar){
				progressDlg.setLabelText(msg + "[" + i + "/" + readList.length + "]");
            }
			var id = node.getElementId(readList[i]);
            var folder = element.completeFolder(id);
			if(elementList.indexOf(folder) != -1){
				continue;
			}
			var elementItem = {"full_path": folder, "relative_path": folder.replace(cenaDir, "")};
            finalOutput["file_list"].push(elementItem);
            addFolderContentToFinalList(folder, true);
			elementList.push(folder);
			counter_file++;
        }
		Print("Number of elements used in scene: " + elementList.length);
    }

    function update_filelist(filePath) { //adiciona o arquivo la lista final
		var item = {"full_path": filePath, "relative_path": filePath.replace(cenaDir, "")};
		var placeHolderName = item["relative_path"].replace(versionName, "{PLACE_HOLDER}.");
		item["relative_path"] = placeHolderName;
        finalOutput["file_list"].push(item);
    }

	function addFolderContentToFinalList(folder, use_filter){//adiciona todos intens do folder ao finalOutput list
	
		if(use_filter){
			var content_list = BD1_ListFolderRecursivelly(folder).filter(validate_element_file);
		} else {
			var content_list = BD1_ListFolderRecursivelly(folder);
		}
		
		for(var i=0; i<content_list.length; i++){
			var item = {"full_path": content_list[i], "relative_path": content_list[i].replace(cenaDir, "")};
			finalOutput["file_list"].push(item);
			counter_file++;
		}
	}
	
}

exports.create_compact_file_list = create_compact_file_list;
