/*
  Function: TB_sceneOpened
  Description: function executes when opening an existing scene.
 */ 
"use strict";
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function TB_sceneOpened(){
	
	//Get File and Project Data
	var projectDATA = BD2_ProjectInfo();
	if(!projectDATA){
		MessageBox.warning("Error ao iniciar as informacoes do projeto! Consulte o MessageLog para mais detalhes!",0,0);
		Print("[BIRDOAPP][ERROR] Loading BirdoApp project paths failed!");
		return false;
	}
	
	var mode = projectDATA.getCurrentSession();
	if(!mode){
		Print("[BIRDOAPP] Não foi encontrada uma sessão válida do BirdoApp. Não irá carregar as ferramentas...");
		return;
	}
	
	var loadingScreen = BD2_loadingBirdo(projectDATA.birdoApp, 10000, "Loading scripts...");

	Print("[BIRDOAPP] BirdoAPP Project DATA:\n");
	Print(projectDATA);
	Print("---------------------------");
	
	//LOAD SCRIPTS AND CREATE MENU AND LOAD TOOLBARS
	Print("[BIRDOAPP] Loading BirdoApp scripts...");

	var scriptIcons = projectDATA.paths["birdoPackage"] + "icons/";
	var toolbars_root = projectDATA.paths["birdoPackage"] + "scripts/ToolBars/";
	var toolbars = BD1_ListFolders(toolbars_root);
	try{
		if(!createMenu(projectDATA, mode)){
			MessageBox.warning("O BirdoApp precisa reiniciar o Menu para ser criado. Aguarde alguns segundos, e aperte 'OK'.", 0,0);
			var menu_create = createMenu(projectDATA, mode);
			Print("[BIRDOAPP] Segunda tentativa de iniciar o menu: " + menu_create);
			if(!menu_create){
				MessageBox.warning("Erro ao carregar o BirdoApp!");
				return false;
			}
		}
		
		for(var i=0; i<toolbars.length; i++){
			var tool_b = toolbars[i];
			var itemScriptsPath = toolbars_root + tool_b + "/";
			var jsFiles = BD1_ListFiles(itemScriptsPath, "*.js");
			
			if(jsFiles.length > 0){//create ToolBar itens
				Print("[BIRDOAPP] Creating ToolBar " + tool_b);
				createToolBar(tool_b, itemScriptsPath, jsFiles, scriptIcons);
			}
		}
		
		//create birdo python object
		try{
			var pyFilePath = projectDATA.birdoApp + "harmony/birdoPack/harmonyPythonInterface.py";
			var myPythonObject = PythonManager.createPyObject(pyFilePath, "birdoAppScripts");
			if(!myPythonObject){
				MessageBox.warning("Erro Criando o PythonObject do BirdoApp! Algumas ferramentas não irão funcionar corretamente!",0,0);
				Print("[BIRDOAPP] ERROR Creating Python Object!");
			} else {
				myPythonObject.addObject("birdoapp_root", projectDATA.birdoApp);
				myPythonObject.addObject("messageLog", MessageLog);

				Print("[BIRDOAPP] Python Object Created!");
			}
		} catch(e){
			Print(e);
			Print("não foi possível criar o python object!");
		}
		Print("[BIRDOAPP] BirdoApp Configure Done...");
		
	} catch(e){
		Print(e);		
	}
}

function createMenu(projDATA, mode){//Cria o Menu na UI do programa
	
	//Menu paths
	var menuPath = projDATA.paths["birdoPackage"] + "scripts/Menu/";
	var menuScripts = BD1_ListFiles(menuPath, "*.js");
	
	//create QApplication menu widget..
	var tbWindow = QApplication.activeWindow();
	if(!tbWindow){
		Print("[BIRDOAPP] Erro a carregar as ferramentas do Birdoapp");
		return false;
	}
	var menuBar = tbWindow.menuBar();
	
	//user permissions	
	var entity_filter_json = menuPath + "entity_filter.json";
	var entity_filter = BD1_ReadJSONFile(entity_filter_json);
	var user_permission = (projDATA.user_type == "DT" || projDATA.user_type == "ANIM_LEAD") ? "LEAD" : "ALL";
	
	//cria os menus
	var menus = {
		"main": menuBar.addMenu("BirdoApp")
	}	
	
	//cria primeiro item do menu: abrir cena
	var abrir_folder = menus["main"].addAction("Abrir Diretório");
	abrir_folder.triggered.connect(this, function() {
		var scene_folder = scene.currentProjectPath();
		var command = System.getenv("windir") + "/explorer.exe";
		process = new Process2(fileMapper.toNativePath(command), fileMapper.toNativePath(scene_folder));
		var ret = process.launch();
		MessageLog.trace(ret);
		if(ret != 1){
			MessageBox.information("Erro ao tentar abrir folder: " + scene_folder);
		} else {
			MessageLog.trace("Folder opened: " + scene_folder);
		}
	});
	menus["main"].addSeparator();

	//cria os menus
	var ajuda_msg = "\n<h1>Ajuda Birdoapp</h1>";
	for(var i=0; i<menuScripts.length; i++){
		Print("Menu script criado: " + menuScripts[i]);
		
		var enable = check_permission(menuScripts[i], entity_filter, mode, projDATA.entity.type, user_permission);
		
		
		var funcName = BD2_RenameAll((menuScripts[i].split("-")[1]).replace(".js", ""), "_", "");
		var itemName = BD2_RenameAll(menuScripts[i].replace(".js", ""), "_", " ");
		var jsPath = menuPath + menuScripts[i];
		var descripition = BD1_ReadFile(jsPath.replace(".js", ".tooltip"));
		ajuda_msg += ("<h2>" + itemName.split("-")[1] + "</h2><b>" + descripition + "</b>")
		try {
			//cria o shortcut
			ScriptManager.addShortcut({id   : "BirdoApp_" + funcName + "_Shortcut",
                               text         : itemName.split("-")[1],
                               action       : funcName + " in " + jsPath,
                               longDesc     : descripition,
                               order        : "256",//???
                               categoryId   : "BirdoApp Menu",
                               categoryText : "Scripts"});
			//cria o menu
			if("menu" in entity_filter[menuScripts[i]]){
				var menu_name = entity_filter[menuScripts[i]]["menu"];
				if(menu_name in menus){
					var menu = menus[menu_name];
				} else {
					var menu = menus["main"].addMenu(menu_name);
					menus[entity_filter[menuScripts[i]]["menu"]] = menu;
				}
			} else {
				var menu = menus["main"];
			}
			var action = menu.addAction(itemName.split("-")[1]);
			action.triggered.connect(this, eval("require(jsPath)." + funcName));
			action.setEnabled(enable);
		} catch (err){
			Print("[BIRDOAPP] error creating birdo Menu:");
			Print(err);
			return false;
		}
	}
	//cria ajuda
	menus["main"].addSeparator();
	var ajuda = menus["main"].addAction("Ajuda");
	ajuda.triggered.connect(this, function() {
		MessageBox.information(ajuda_msg);
	});
	var terms = menus["main"].addAction("Termos Legais");
	terms.triggered.connect(this, function() {	
		var pythonPath = projDATA.birdoApp + "venv/Scripts/python";
		var pyFile = projDATA.birdoApp + "app/utils/birdoapp_about.py";
		var start = Process2(pythonPath, pyFile, "terms");
		var ret = start.launch();
		MessageLog.trace("Terms display python call: " + ret);
	});
	var creditos = menus["main"].addAction("Créditos");
	creditos.triggered.connect(this, function() {	
		var pythonPath = projDATA.birdoApp + "venv/Scripts/python";
		var pyFile = projDATA.birdoApp + "app/utils/birdoapp_about.py";
		var start = Process2(pythonPath, pyFile, "credits");
		var ret = start.launch();
		MessageLog.trace("Credits display python call: " + ret);
	});
	
	
	Print("[BIRDOAPP] Birdo Menu criado com sucesso!");
	return true;
}

function createToolBar(toolBar, toolBarFolder, scriptsJs, iconsPath){//Create Toolbar
	try{
		var BirdoToolbar = new ScriptToolbarDef({ id          : "BirdoApp " + toolBar,
                                                  text        : "BirdoApp " + toolBar,
                                                  customizable: "false" });
	} catch (err){
		Print("[BIRDOAPP] error creating birdo ToolBar: " + toolBar);
		Print(err);
		return false;
	}
	
	for(var i = 0; i < scriptsJs.length; i++){

		var itemName = scriptsJs[i].replace(".js", "");
		var jsPath = toolBarFolder + scriptsJs[i];
		var iconFile = iconsPath + scriptsJs[i].replace(".js", ".png");
		var tooltip = jsPath.replace(".js", ".tooltip");
		var descripition = itemName;
				
		if(BD1_FileExists(tooltip)){
			descripition = BD1_ReadFile(tooltip);
		}
		
		try {
			ScriptManager.addShortcut({id       : itemName + "Shortcut",
                                   text         : itemName,
                                   action       : itemName + " in " + jsPath,
                                   longDesc     : descripition,
                                   order        : "256",//???
                                   categoryId   : "BirdoApp " + toolBar,
                                   categoryText : "Scripts"});	
			
			if(BD1_FileExists(iconFile)){
				BirdoToolbar.addButton({ text     : descripition,
									     icon     : iconFile,
										 action   : itemName + " in " + jsPath,
										 shortcut : itemName + "Shortcut"});
			}
			
		} catch (err){
			Print(err);
		}

	}	
	ScriptManager.addToolbar(BirdoToolbar);
	
	return true;
}

//valida o arquivo .js com as permissões...
function check_permission(item, filter_data, mode, file_type, user_type){
	return filter_data[item]["mode"].indexOf(mode) != -1 && 
	filter_data[item]["file_type"].indexOf(file_type) != -1 && 
	(filter_data[item]["user_type"] == "ALL" || filter_data[item]["user_type"] == user_type);
}