include("BD_2-ScriptLIB_Geral.js");

function SendNotes(){
	var projectDATA = BD2_ProjectInfo();
	projectDATA.user_type = "ANIM_LEAD" // FIXME
	if(projectDATA.user_type != "ANIM_LEAD"){
		MessageBox.information("Apenas para supervisores.");
		return;
	}

	var _notes = "Top/_NOTES";

	// check project
	if(!projectDATA){
		MessageBox.information("Não foi possível acessar informações sobre o projeto.");
		return;
	}

	// check for node space
	if(node.getName(_notes)==""){
		MessageBox.information("Essa cena não tem um espaço dedicado para receber notes.");
		return;
	}

	// check for scene name
	if(!BD2_check_padrao_scene(scene.currentScene())){ // SHADOWED!!!
		MessageBox.information("Nome de cena fora do padrão do projeto.");
		return;
	}

	var notesNodes = node.subNodes(_notes);
	notesNodes = notesNodes.filter(function (n){return node.type(n) == "READ";})
	notesNodes = notesNodes.filter(function (n){return /nt_\d{8}_\d{2}h\d{2}m\d{2}s$/.test(n);});

	// check for valid notes
	if(notesNodes.length <= 0){
		var m = "Não há notes a serem enviados.\nCertifique-se que estão dentro de '";
		m = m + _notes + "' e que foram criados com o scrip 'BD_addNotes'";
		MessageBox.information(m);
		return;
	}

	notesNodes.sort();
	var nodeToSend = notesNodes[notesNodes.length - 1];

	// Confirm dialog
	var d = new Dialog();
	d.title = "Confirma note";
	d.addSpace(5);
	var l = new Label();
	l.text = "O note que você quer enviar é esse?";
	d.add(l);
	d.addSpace(5);
	var n = new Label();
	n.text = node.getName(nodeToSend);
	d.add(n);
	d.addSpace(15);
	d.cancelButtonText = "Cancela";
	d.okButtonText = "Ok";
	if(!d.exec()){return ;}

	// saving template
	selection.clearSelection();
	selection.addNodeToSelection(nodeToSend);
	var tplName = scene.currentScene() + "-" + node.getName(nodeToSend);
	var localNotesPath = projectDATA.systemTempFolder + "/BirdoApp/notes";
	var templateName = copyPaste.createTemplateFromSelection(tplName, localNotesPath);
		
	if(templateName == ""){
		MessageBox.warning("ERRO ao criar o template!", 1,0);
		return;
	}

	// compressing template
	var compress = projectDATA.birdoApp + "app/utils/compress.py";
	var pyObj = PythonManager.createPyObject(compress);
	var sevenZip = about.getBinaryPath() + "/bin_3rdParty/7z.exe";
	var templateZip = localNotesPath + "/" + templateName + ".zip";
	var templatePath = localNotesPath + "/" + templateName;

	if(0 != pyObj.py.f(quoteSpaces(sevenZip), quoteSpaces(templateZip), quoteSpaces(templatePath))){
		MessageBox.warning("ERRO ao compactar o template!", 1,0);
		return;
	}

	var zipFile = new File(templateZip);
	if(!zipFile.exists){
		MessageBox.warning("ERRO ao conferir o template!", 1,0);
		return;
	}

	// Uploading!
	//PATHS NEEDED:
	var venvPath = projectDATA.birdoApp + "/venv/Lib/site-packages"; // for oc
	var utilsPath = projectDATA.birdoApp + "/app/utils"; // for decode
	var assurePathFile = projectDATA.birdoApp + "/app/utils/nc_ensure_path_upload.py"
	var login = {}
	login.url = projectDATA.server.url;
	login.user = projectDATA.server.login.user;
	login.passwd = projectDATA.server.login.pw;

	var remotePath = "MNM_TBLIB/_Notes/" + projectDATA.entity.ep + "/" + projectDATA.entity.name + "/";
	PythonManager.addSysPath(venvPath);
	PythonManager.addSysPath(utilsPath);
	pyObj = PythonManager.createPyObject(assurePathFile);

	var myAddObj;
	if(typeof(pyObj.addObjectToPython) == "function"){
		myAddObj = pyObj.addObjectToPython;
	}else{
		myAddObj = pyObj.addObject;
	}

	// myAddObj("messageLog", MessageLog);
	myAddObj("login", login);
	
	var rtrn = "" + pyObj.py.ensure_path_and_upload(remotePath, templateZip);
	if (rtrn.indexOf("OK!") != -1){
		MessageBox.information("Note enviado com sucesso!");
	}else{
		MessageBox.warning("ERRO ao subir o note", 1,0);
		return;
	}

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

exports.SendNotes = SendNotes;
