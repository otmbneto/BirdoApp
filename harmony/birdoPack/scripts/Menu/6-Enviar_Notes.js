/*
	Script que publica o node de note selecionado para o server;
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function EnviarNotes(){

	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		MessageBox.information("Não foi possível acessar informações sobre o projeto.");
		return;
	}
	if(projectDATA.user_type != "ANIM_LEAD" && projectDATA.user_type != "DT"){
		MessageBox.information("Apenas para supervisores.");
		return;
	}

	//escolha do node de note
	var nodeToSend = select_note();
	if(!nodeToSend){
		Print("canceled!");
		return;
	}

	// saving template
	selection.clearSelection();
	selection.addNodeToSelection(nodeToSend);
	var tplName = scene.currentScene() + "-" + node.getName(nodeToSend);
	var localNotesPath = projectDATA.systemTempFolder + "/BirdoApp/notes";
	if(!BD1_CleanFolder(localNotesPath)){
		Print("Falha em criar o folder temp!");
		return;
	}
	var templateName = copyPaste.createTemplateFromSelection(tplName, localNotesPath);
	if(templateName == ""){
		MessageBox.warning("ERRO ao criar o template!", 1,0);
		return;
	}

	// compressing template
	var templatePath = localNotesPath + "/" + templateName;
	var templateZip = BD1_ZipFile(templatePath, templateName, localNotesPath);
	if(!BD1_FileExists(templateZip)){
		MessageBox.warning("ERRO ao compactar o template!", 1,0);
		return;
	}
	
	var destPath = projectDATA.getTBLIB("server") + "_notes/" + projectDATA.entity.ep + "/" + projectDATA.entity.name;
	BD1_createDirectoryREDE(destPath);
	if(BD1_CopyFile(templateZip, destPath + "/" + templateName + ".zip")){
		MessageBox.information("O note '" + templateName + "foi enviado para o servidor!.", 1, 0, 0, "Note Enviado");
		return;
	}else{
		MessageBox.warning("Algo de errado aconteceu ao copiar o note para o servidor.", 1,0);
		return;
	}

	///// HELPER FUNCTIONS /////
	function select_note(){//seleciona o node de note para enviar
		var _notes = "Top/_NOTES";
		var notesNodes = node.subNodes(_notes).filter(function (n){return node.type(n) == "READ" && /nt_\d{8}_\d{2}h\d{2}m\d{2}s$/.test(n);})
		// check for valid notes
		if(notesNodes.length <= 0){
			var m = "Não há notes a serem enviados.\nCertifique-se que estão dentro de '";
			m = m + _notes + "' e que foram criados com o scrip 'BD_addNotes'";
			MessageBox.information(m);
			return false;
		}
		notesNodes.sort();
		notesNodes.reverse();

		// Confirm dialog
		var d = new Dialog();
		d.title = "Selecione o note";
		d.addSpace(5);
		var combo = new ComboBox();
		combo.itemList = notesNodes.map(function(item){ return node.getName(item)});
		combo.label = "Escolha o note para enviar:";
		d.add(combo);
		d.addSpace(15);
		d.cancelButtonText = "Cancela";
		d.okButtonText = "Enviar";

		var rc = d.exec();
		if(!rc){
			return false;
		}
		
		return _notes + "/" + combo.currentItem;
	}
}
exports.EnviarNotes = EnviarNotes;
