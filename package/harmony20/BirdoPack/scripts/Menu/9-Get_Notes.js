include("BD_2-ScriptLIB_Geral.js");

function GetNotes(){
	var _notesGroup = "Top/_NOTES";
	var currScene = scene.currentScene();

	if(!BD2_check_padrao_scene(currScene)){
		return;
	}

	if(node.getName(_notesGroup)==""){
		MessageBox.information("Essa cena não tem um espaço dedicado para receber notes.");
		return;
	}

	var projectDATA = BD2_ProjectInfo();
	var remotePath = "MNM_TBLIB/_Notes/" + projectDATA.entity.ep + "/" + projectDATA.entity.name + "/"; //FIXME

	var venvPath = projectDATA.birdoApp + "venv/Lib/site-packages"; // for oc
	var utilsPath = projectDATA.birdoApp + "app/utils"; // for decode
	var getListFile = projectDATA.birdoApp + "app/utils/nc_notes_tasks.py";
	var login = {};
	login.url = projectDATA.server.url;
	login.user = projectDATA.server.login.user;
	login.passwd = projectDATA.server.login.pw;

	PythonManager.addSysPath(venvPath);
	PythonManager.addSysPath(utilsPath);
	var pyObj = PythonManager.createPyObject(getListFile);

	var myAddObj;
	if(typeof(pyObj.addObjectToPython) == "function"){
		myAddObj = pyObj.addObjectToPython;
	}else{
		myAddObj = pyObj.addObject;
	}

	// myAddObj("messageLog", MessageLog);
	myAddObj("login", login);
	var notesList = "" + pyObj.py.get_list_nodes(remotePath);

	if(notesList == "" || notesList.indexOf("ERRO")!= -1){
		MessageBox.information("Parece não haver notes para essa cena.");
		return;
	}

	var confirmNoteDlg = new Dialog();
	confirmNoteDlg.title = "Escolha o note";
	var chooseNote = new ComboBox();
	chooseNote.label = "Qual note deseja baixar?"
	chooseNote.editable = true;
	chooseNote.itemList = notesList.split(",");
	confirmNoteDlg.add(chooseNote);
	var selectedNote = "";
	if (confirmNoteDlg.exec())
		selectedNote = chooseNote.currentItem;
	else
		return;

	var localNotesList = node.subNodes(_notesGroup).filter(function(i){return node.type(i) == "READ";});
	localNotesList = localNotesList.map(function (n){return projectDATA.entity.name + "-" + node.getName(n) + ".tpl.zip";});
	if(localNotesList.indexOf(selectedNote) != -1){
		MessageBox.information("O note selecionado já está na cena.");
		return;
	}
	var sevenZip = quoteSpaces(about.getBinaryPath() + '/bin_3rdParty/7z.exe');
	var cmprss = "" + pyObj.py.download_and_uncompress(sevenZip, remotePath + selectedNote, projectDATA.systemTempFolder + "/BirdoApp/");
	
	if(cmprss != "OK!"){
		MessageBox.information("Nao foi possivel baixar e/ou descompactar o note.");
		return;
	}

	scene.beginUndoRedoAccum("Get notes.");

	copyPaste.setPasteSpecialCreateNewColumn(true);
	copyPaste.usePasteSpecial(true);
	copyPaste.setExtendScene(true);
	copyPaste.setPasteSpecialColorPaletteOption("DO_NOTHING");
	var tpl = copyPaste.pasteTemplateIntoScene(projectDATA.systemTempFolder + "/BirdoApp/" + selectedNote.slice(0, -4),"",1);

	if(!tpl){
		MessageBox.information("Falha ao importar o NOTE para esta cena!\nAvise o Leo!");
		return
	}

	node.moveToGroup(selection.selectedNodes(0), _notesGroup);

	clean = "" + pyObj.py.clean_notes(projectDATA.systemTempFolder + "/BirdoApp", selectedNote);

	if(clean != "OK!"){
		MessageBox.information("Falha ao limpar arquivos temporarios.");
		return
	}

	MessageBox.information("Note importada com sucesso!");
	scene.endUndoRedoAccum();

	///// SHADOWED FUNCTIONS /////

	// SHADOW from original at 'BD_2-ScriptLIB_Geral.js'
	function BD2_check_padrao_scene(cena){
		var scene_regex = /\w{3}_EP\d{3}_(sc|SC)\d{4}/;
		Print(scene_regex);
		if(!scene_regex.test(cena)){
			return false;
		}
		return true;
	}

	///// HELPER FUNCTIONS /////

	// put " " around folders with spaces of a path
	function quoteSpaces(str){
		var	arr;
		var	finalPath;

		arr = str.split("/");
		arr = arr.map(function(i){
			if(i.indexOf(" ") >= 0){
				return('"' + i + '"');
			}else{
				return(i);
			}
		});
		finalPath = "";
		for(i in arr){
			finalPath = finalPath + arr[i] + "/";
		}
		return(finalPath.slice(0, -1));
	}
}

exports.GetNotes = GetNotes;
