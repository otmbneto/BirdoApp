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

	var loadingScreen = BD2_loadingBirdo(projectDATA.birdoApp, 15000, "Loading scripts...");

	Print("[BIRDOAPP] BirdoAPP Project DATA:\n");
	Print(projectDATA);
	Print("---------------------------");
	
	//LOAD SCRIPTS AND CREATE MENU AND LOAD TOOLBARS
	Print("[BIRDOAPP] Loading BirdoApp scripts...");

	var scriptIcons = projectDATA.paths["birdoPackage"] + "icons/";
	var toolbars_root = projectDATA.paths["birdoPackage"] + "scripts/ToolBars/";
	var toolbars = BD1_ListFolders(toolbars_root);
	try{
		createMenu(projectDATA);
		
		for(var i=0; i<toolbars.length; i++){
			var tool_b = toolbars[i];
			var itemScriptsPath = toolbars_root + tool_b + "/";
			var jsFiles = BD1_ListFiles(itemScriptsPath, "*.js");
			
			if(jsFiles.length > 0){//create ToolBar itens
				Print("[BIRDOAPP] Creating ToolBar " + tool_b);
				createToolBar(tool_b, itemScriptsPath, jsFiles, scriptIcons);
			}
		}
	} catch(e){
		Print(e);		
	}
	
	Print("[BIRDO] Birdo Configure Done...");

}

function createMenu(projDATA){//Cria o Menu na UI do programa
	
	//Menu paths
	var menuPath = projDATA.paths["birdoPackage"] + "scripts/Menu/";
	var menuScripts = BD1_ListFiles(menuPath, "*.js");
	
	//create QApplication menu widget..
	var menuBar = QApplication.activeWindow().menuBar();
	var menu = menuBar.addMenu("BirdoApp");
	
	//se a entity for invalida, cria somente o menu com 11-Ajuda
	if(!projDATA.entity.type){
		var ajuda = menu.addAction("Ajuda");
		ajuda.triggered.connect(this, function(){
			MessageBox.information("Esta cena não faz parte de um projeto do BirdoApp, mas você ainda pode adicionar os ToolBars do BirdoApp e utilizar as ferramentas disponíveis em cada um.");
		});
		return;
	}
	
	//user permissions	
	var entity_filter_json = menuPath + "entity_filter.json";
	var entity_filter = BD1_ReadJSONFile(entity_filter_json);
	var permission = (projDATA.user_type == "DT" || projDATA.user_type == "ANIM_LEAD") ? "LEAD" : "OTHER";

	//cria os menus
	var ajuda_msg = "";
	for(var i=0; i<menuScripts.length; i++){
		
		if(entity_filter[projDATA.entity.type][permission].indexOf(menuScripts[i]) == -1){
			continue;
		}
		
		var funcName = BD2_RenameAll((menuScripts[i].split("-")[1]).replace(".js", ""), "_", "");
		var itemName = BD2_RenameAll(menuScripts[i].replace(".js", ""), "_", " ");
		var jsPath = menuPath + menuScripts[i];
		var descripition = BD1_ReadFile(jsPath.replace(".js", ".tooltip"));
		ajuda_msg += (itemName + "\n" + descripition + "\n------\n")
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
			var action = menu.addAction(itemName.split("-")[1]);
			action.triggered.connect(this, eval("require(jsPath)." + funcName));
			
		} catch (err){
			Print("[BIRDOAPP] error creating birdo Menu:");
			Print(err);
			return false;
		}
	}
	//cria ajuda
	var ajuda = menu.addAction("Ajuda");
	ajuda.triggered.connect(this, function() {
		MessageBox.information(ajuda_msg);
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
