/*
	Script que baixa o ultimo note para a cena.
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function ImportarNotes(){
	
	var _notesGroup = "Top/_NOTES";
	if(node.getName(_notesGroup)==""){
		MessageBox.information("Essa cena não tem um espaço dedicado para receber notes.");
		return;
	}

	//get project data class
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		MessageBox.information("Não foi possível acessar informações sobre o projeto.");
		return;
	}
	
	var selectedNote = select_note_download(projectDATA);
	var localNotesList = node.subNodes(_notesGroup).filter(function (n){return node.type(n) == "READ" && /nt_\d{8}_\d{2}h\d{2}m\d{2}s$/.test(n);})
	localNotesList = localNotesList.map(function (n){return projectDATA.entity.name + "-" + node.getName(n) + ".tpl.zip";});
	if(localNotesList.indexOf(BD1_fileBasename(selectedNote)) != -1){
		MessageBox.information("O note selecionado já está na cena.");
		return;
	}

	var temp_folder = projectDATA.systemTempFolder + "/BirdoApp/notes";
	if(!BD1_CleanFolder(temp_folder)){
		Print("Falha em criar o folder temp!");
		return;
	}

	if(!BD1_UnzipFile(selectedNote, temp_folder)){
		MessageBox.information("Nao foi possivel baixar e/ou descompactar o note.");
		return;
	}
	var temp_tpl = temp_folder + "/" + BD1_fileBasename(selectedNote).replace(".zip", "");
	if(!BD1_DirExist(temp_tpl)){
		MessageBox.warning("Algo deu errado ao descompactar template do note!",0,0);
		return;
	}
	
	scene.beginUndoRedoAccum("Get notes.");
	try{
		copyPaste.setPasteSpecialCreateNewColumn(true);
		copyPaste.usePasteSpecial(true);
		copyPaste.setExtendScene(true);
		copyPaste.setPasteSpecialColorPaletteOption("DO_NOTHING");
		var tpl = copyPaste.pasteTemplateIntoScene(temp_tpl,"", 1);
		if(!tpl){
			MessageBox.information("Falha ao importar o NOTE para esta cena!!");
			return
		}
	} catch(e){
		scene.cancelUndoRedoAccum();
		Print(e);
	}

	node.moveToGroup(selection.selectedNodes(0), _notesGroup);

	scene.endUndoRedoAccum();
	
	MessageBox.information("Note importada com sucesso!");
	Print("Note importado com sucesso!");

	///// HELPER FUNCTIONS /////
	function select_note_download(projectDATA){//seleciona o node de note para enviar
	
		var server_notes_path = projectDATA.getTBLIB("server") + "_notes/" + projectDATA.entity.ep + "/" + projectDATA.entity.name;
		var notesList = BD1_ListFiles(server_notes_path, "*.zip");
		if(notesList == "" || notesList.length == 0){
			MessageBox.information("Parece não haver notes para essa cena.");
			return false;
		}
		notesList.sort();
		notesList.reverse();

		// Confirm dialog
		var d = new Dialog();
		d.title = "Selecione o note";
		d.addSpace(5);
		var combo = new ComboBox();
		combo.itemList = notesList.map(function(item){ return BD1_fileBasename(item)});
		combo.label = "Escolha o note para baixar:";
		d.add(combo);
		d.addSpace(15);
		d.cancelButtonText = "Cancela";
		d.okButtonText = "Baixar";

		var rc = d.exec();
		if(!rc){
			return false;
		}
		
		return server_notes_path + "/" + combo.currentItem;
	}
}
exports.ImportarNotes = ImportarNotes;
