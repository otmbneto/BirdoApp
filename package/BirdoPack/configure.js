"use strict";
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


/*pipeline: configure:  [X]- Criar objeto pathBirdo e jogar no print;
						[X]- checar conexao com o nextcloud atravez do metodo do pathBirdo;
						[X]- checar se ha versao nova do packBirdo (jogar aviso dizendo para atualizar!); (falta criar o zip do pack na rede e testar uma forma de atualizar
						[X]- criar atalhos;
						[ ]- filtar menus e toolBars pelo UserType;
							TESTAR - fazer um json no folder com a lista de arquivos (cuidar para nao deixar arquivos nao documentados)
						[X]- criar tooldBars;
						[ ]- atualizar o TB_SceneOpened.js da cena (testar copiar esse arquivo pra cena antes de iniciar);
					
*/
function configure(packageFolder, packageName){
	
	Print("[BIRDO] Package " + packageName + " configure was called in folder: " + packageFolder);
	
	if(about.isPaintMode()){
		Print("[BIRDO] Paint mode... leaving package");
		return;
	}
	
	//Get File and Project Data
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		MessageBox.warning("Error ao iniciar as informacoes do projeto! Consulte o MessageLog para mais detalhes!",0,0);
		Print("[ERROR] Loading project paths failed!");
		return false;
	}

	var loadingScreen = BD2_loadingBirdo(projectDATA.birdoApp, 15000, "Loading_scripts...");


	Print("[BIRDO] Birdo Project DATA:\n");
	Print(projectDATA);
	Print("---------------------------");
	
	if(!checkMenuUpdate()){
		MessageBox.warning("Arquivo menu.xml nao atualizado! Atualize o pacote de scripts da Birdo para poder usar os Scripts!", 0, 0);
		Print("[BIRDO] 'menu.xml' file is not updated! UPdate BirdoPackage Scripts to Use the scripts... canceling BirdoPackage");
		return false;
	}
	
	
	//LOAD SCRIPTS AND CREATE MENU AND LOAD TOOLBARS
	Print("[BIRDO] Loading Birdo scripts...");

	var scriptsPath = packageFolder + "/scripts/";
	var scriptIcons = packageFolder + "/icons/";
	var scriptsTypes = BD1_ListFolders(scriptsPath);
	
	for(var i=0; i<scriptsTypes.length; i++){
		
		var itemScriptsPath = scriptsPath + scriptsTypes[i] + "/";
		var jsFiles = BD1_ListFiles(itemScriptsPath, "*.js");

		if(scriptsTypes[i] == "Menu"){//Create Menu items
			Print("[BIRDO] Creating Menu...");
			createMenu(projectDATA, itemScriptsPath, jsFiles);
			continue;
		}
		
		if(jsFiles.length > 0){//create ToolBar itens
			Print("[BIRDO] Creating ToolBar " + scriptsTypes[i]);
			createToolBar(scriptsTypes[i], itemScriptsPath, jsFiles, scriptIcons);
		}
	}
	
	Print("[BIRDO] Birdo Configure Done...");

}


function createMenu(projDATA, menuPath, menuScripts){//Cria o Menu na UI do programa

	var entity = projDATA.entity.type;
	var entity_filter_json = menuPath + "entity_filter.json";
	var entity_filter = BD1_ReadJSONFile(entity_filter_json);
	
	//user permissions
	var permission = (projDATA.user_type == "DT" || projDATA.user_type == "ANIM_LEAD") ? "LEAD" : "OTHER";
	Print("TESTE INIT PERMISSION: " + permission);
	for(var i=0; i<menuScripts.length; i++){
		
		if(entity_filter[entity][permission].indexOf(menuScripts[i]) == -1){
			continue;
		}
		
		var funcName = BD2_RenameAll((menuScripts[i].split("-")[1]).replace(".js", ""), "_", "");
		var itemName = BD2_RenameAll(menuScripts[i].replace(".js", ""), "_", " ");
		var jsPath = menuPath + menuScripts[i];
		var descripition = BD1_ReadFile(jsPath.replace(".js", ".tooltip"));
		try {
			ScriptManager.addShortcut({id   : "Birdo" + funcName + "Shortcut",
                               text         : itemName.split("-")[1],
                               action       : funcName + " in " + jsPath,
                               longDesc     : descripition,
                               order        : "256",//???
                               categoryId   : "Birdo Menu",
                               categoryText : "Scripts"});
			
			ScriptManager.addMenuItem({targetMenuId : "Birdo",
                                       id           : "Birdo" + funcName,
                                       icon         : "",
                                       text         : itemName.split("-")[1],
                                       action       : funcName + " in " + jsPath,
                                       shortcut     : "Birdo" + itemName + "Shortcut"});
		} catch (err){
			MessageBox.warning("Error creating Birdo Menu!", 0, 0);
			Print("[BIRDO] error creating birdo Menu:");
			Print(err);
			return false;
		}
	}
	Print("[BIRDO] Birdo Menu successfully created!");
	return true;
}

function createToolBar(toolBar, toolBarFolder, scriptsJs, iconsPath){//Create Toolbar
	try{
		var BirdoToolbar = new ScriptToolbarDef({ id          : "Birdo" + toolBar,
                                                  text        : "Birdo " + toolBar,
                                                  customizable: "false" });
	} catch (err){
		Print("[BIRDO] error creating birdo ToolBar: " + toolBar);
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
                                   categoryId   : "Birdo " + toolBar,
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
//CHECK FUNCTIONS
function checkMenuUpdate(){//checa se o menu.xml do toon boom esta atualizado para receber o Menu Birdo
	var menuFile = specialFolders.resource + "/menus.xml";
	var file = new File(menuFile);
	if(!file.exists){
		Print("arquivo nao existe: " + menuFile);
		return false;
	}
	file.open(FileAccess.ReadOnly);
	var string = file.read();
	file.close();
	return string.indexOf('<menu id="Birdo" text="Birdo" >') != -1;
}


exports.configure = configure;

