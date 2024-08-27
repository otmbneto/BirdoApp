include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_UpdateCompBG(){
	
	//inicia o birdoApp
	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
		

	var psds_data = get_scene_psds(projectDATA);
	if(!psds_data){
		Print("invalid psd scene selection!");
		return;
	}
	
	var d = new createInrterface(projectDATA, psds_data);
	d.ui.show();
	d.ui.activateWindow();

}




function createInrterface(projectDATA, psd_data){
	
	var uifile = projectDATA.paths.birdoPackage + "ui/BD_UpdateBG.ui";
	this.ui = UiLoader.load(uifile); 

	//class variables
	this.psds_data = psd_data;
	
	//BRUSHES FOR ITENS COLORS
	this.redStyle = "color: rgb(255,150,10)";
	this.greenStyle = "color: rgb(100,245,120)";
	
	//status (if psds are valid)
	this.is_valid = true;
	
	//add files widgets
	try{
		//update selected psd widget name
		this.ui.groupBoxFiles.labelSelected.text = this.psds_data["main"].name;
		this.ui.groupBoxFiles.labelServer.text = this.psds_data["server"].name;
		var layoutCopies = new QVBoxLayout();
		var groupCopies = this.ui.groupBoxFiles.scrollAreaFiles.widget().widgetCopies;
		groupCopies.setLayout(layoutCopies);
		var layoutOthers = new QVBoxLayout();
		var groupOthers = this.ui.groupBoxFiles.scrollAreaFiles.widget().widgetOthers;
		groupOthers.setLayout(layoutOthers);
		
		//create scene psds widgets
		if(this.psds_data.copies.length == 0){
			var label = new QLabel("No Copies found!");
			layoutCopies.addWidget(label, 0, Qt.AlignLeft | Qt.AlignTop);	
			groupCopies.enabled = false;
		} else {
			for(var i=0; i<this.psds_data["copies"].length; i++){
				layoutCopies.addWidget(this.psds_data["copies"][i].widget, i, Qt.AlignJustify | Qt.AlignTop);	
			}
		}
		//create others psds widgets
		if(this.psds_data.copies.length == 0){
			var label = new QLabel("No Other PSDs found!");
			layoutOthers.addWidget(label, 0, Qt.AlignLeft | Qt.AlignTop);	
		} else {
			for(var i=0; i<this.psds_data["others"].length; i++){
				layoutOthers.addWidget(this.psds_data["others"][i].widget, i, Qt.AlignJustify | Qt.AlignTop);	
			}
		}
		Print("Widgets files created!");
	} catch(e){
		Print("ERROR creating files widgets...");
		Print(e);
	}
	
	//add layers items
	try{
		var layoutA = new QVBoxLayout();
		var groupA = this.ui.groupLayers.scrollArea.widget().widgetA;
		groupA.setLayout(layoutA);
		var layoutB = new QVBoxLayout();
		var groupB = this.ui.groupLayers.scrollArea.widget().widgetB;
		groupB.setLayout(layoutB);
		
		//find max layers length
		var bigger_list = this.psds_data["main"]["layers_count"] < this.psds_data["server"]["layers_count"] ? this.psds_data["main"]["layers_count"] : this.psds_data["server"]["layers_count"];
		
		for(var i=0; i<bigger_list; i++){
			var layerA = i < this.psds_data["main"]["layers_count"] ? this.psds_data["main"]["layers"][i] : " - - ";
			var layerB = i < this.psds_data["server"]["layers_count"] ? this.psds_data["server"]["layers"][i] : " - - ";
			if(layerA == layerB){
				var cor = this.greenStyle;
			} else {
				var cor = this.redStyle;
				this.is_valid = false;
			}
			
			//A widgets
			var labelA = new QLabel("[" + i + "] :" + layerA);
			labelA.styleSheet = cor;
			layoutA.addWidget(labelA, i, Qt.AlignJustify | Qt.AlignTop);

			//B widgets
			var labelB = new QLabel("[" + i + "] :" + layerB);
			labelB.styleSheet = cor;
			layoutB.addWidget(labelB, i, Qt.AlignJustify | Qt.AlignTop);
		}
		Print("Widgets layers created!");
	} catch(e){
		Print(e);
	}
	
	//update resume widgets
	try{
		var color = this.psds_data["main"]["layers_count"] == this.psds_data["server"]["layers_count"] ? this.greenStyle : this.redStyle;
		this.ui.groupResume.labelLayersA.text = this.psds_data["main"]["layers_count"];
		this.ui.groupResume.labelLayersB.text = this.psds_data["server"]["layers_count"];
		this.ui.groupResume.labelStatus.text = this.is_valid ? "VALID PSD": "INVALID PSD";
		this.ui.groupResume.labelStatus.styleSheet = this.is_valid ? this.greenStyle: this.redStyle;
		this.ui.groupResume.labelLayersA.styleSheet = color;
		this.ui.groupResume.labelLayersB.styleSheet = color;
		Print("Widgets resume updated!!");
	} catch(e){
		Print("ERROR setting resume widgets..");
		Print(e);
	}
	
	//call back functions
	this.onClose = function(){
		Print("Closed!");
		this.ui.close();
	}
	
	this.onUpdate = function(){
		Print("Updating background psds...");
		
		//check if server psd is identical to local psd
		var size_compare = compareFileSize(this.psds_data.server.file, this.psds_data.main.file);
		if(this.psds_data.main.raw_data.layers.toString() == this.psds_data.server.raw_data.layers.toString() && size_compare){
			if(!askQuestion("Aparentemente o PSD da cena já foi atualizado.\nDeseja importar mesmo assim?")){
				Print("Canceled!!!");
				this.ui.close();
				return;
			}
		}
		
		//warning that the psd is invalid
		if(!this.is_valid){
			if(!askQuestion("O PSD da cena nao e compativel com o fechamento de comp da rede. Deseja importar mesmo assim?")){
				Print("Canceled to fix psd file!");
				this.ui.close();
				return;
			}
		}
		
		//warning de extra psds na cena
		if(this.psds_data["others"].length > 0){
			MessageBox.warning("ATENCAO! Há outros psds na cena que aparentemente NAO sao da cena.\nFavor verificar!");
		}
		
		try{
			
			Print("Coping selected psd file...");
			if(!copy_file_with_pb(projectDATA, this.psds_data["server"]["file"], this.psds_data["main"]["file"])){
				MessageBox.warning("ERROR copying files!",0,0);
				this.ui.close();
				return;
			}
			
			//update copies psds
			var copies_cheked = this.psds_data["copies"].filter(function(item){ return item.widget.checked;});
			Print("Coping " + copies_cheked.length + "copies psds file(s)!");
			for(var i=0; i<copies_cheked.length; i++){
				if(!copy_file_with_pb(projectDATA, this.psds_data["server"]["file"], copies_cheked[i]["file"])){
					MessageBox.warning("ERROR copying files!",0,0);
					this.ui.close();
					return;
				}				
			}
		} catch(e){
			Print(e);
		}
		
		var msg = "Scene Background updated!";
		Print(msg);
		MessageBox.information(msg);
		
		this.ui.close();
	}
	
	//connections
	this.ui.pushUpdate.clicked.connect(this, this.onUpdate);
	this.ui.pushCancel.clicked.connect(this, this.onClose);
	
	//helper funcions
	function Print(msg){
		if(typeof msg == "object"){
			var msg = JSON.stringify(msg, null, 2);
		}
		MessageLog.trace(msg);
		System.println(msg);
	}
	
	function askQuestion(msg){
		var value = MessageBox.information(msg , 3, 4);
		return value == 3 || value == 1;//fix for weird bug in harmony 22 where the buttons are not properly shown.
	}
	
	function copy_file_with_pb(proj_data, src_file, dst_file){
		var python = proj_data.birdoApp + "venv/Scripts/python.exe";
		var pyFile = "app/utils/copy_file_with_pb.py";
		var start = Process2(python, pyFile, src_file, dst_file, "override");
		var ret = start.launch();
		return ret == 0;
	}
	
	function compareFileSize(filePath1, filePath2){
		var size1 = new QFileInfo(filePath1).size();
		var size2 = new QFileInfo(filePath2).size();
		return size1 == size2;
	}
}

//retorna objeto com info do psd
function get_psd_data(psd_path, name){
	
	var data = CELIO.getInformation(psd_path, true);
	
	//psd data
	var final_data = {
		"name": name,
		"file": psd_path,
		"layers_count": data.layers.length,
		"raw_data": data,
		"layers": []
	}
	
	//filter layers names
	data.layers.forEach(function(item){
		final_data["layers"].push(item.layerName);
	});
	return final_data;
}

//get all scene related psds
function get_scene_psds(projData){
	
	/*	pega o psd mais atual da cena no server
		- TODO passar essa funcao de pegar o caminho dos bgs na rede pro birdoPath do projeto!
	*/
	var ep = projData.entity.ep;
	var server_bgs_folder = [projData.getServerRoot()+ projData.paths.episodes + ep, "02_ASSETS", "01_BG", "02_POST_BOARD", "07_FECHAMENTO", "02_COMP"].join("/");
	if(!BD1_DirExist(server_bgs_folder)){
		MessageBox.warning("Nenhum folder de bg de fechamento da comp encontrado! Avise a direção tecnica!",0,0);
		return false;
	}
	
	var server_psds = BD1_ListFiles(server_bgs_folder, projData.entity.name + "*.psd");
	if(!server_psds){
		MessageBox.warning("ERROR! Can't find scene comp psd in server!",0 ,0);
		return false;
	}
	var comp_psd = server_bgs_folder + "/" + server_psds[server_psds.length - 1];
	
	
	//test if has valid selected file
	var sel = selection.selectedNode(0);
	var elementId = node.getElementId(sel);
	var element_folder = element.completeFolder(elementId);
	if(!element_folder){
		MessageBox.warning("No Element folder found for selected Node!", 0, 0);
		return false;
	}
	
	var scene_psd = BD1_ListFiles(element_folder, projData.entity.name + "*.psd")[0];
	if(!scene_psd){
		MessageBox.warning("No PSD found for selected Node!", 0, 0);
		return;
	}
	//psds object:
	var psds = {
		"main": get_psd_data(element_folder + "/" + scene_psd, BD1_fileBasename(element_folder)),
		"copies": [],
		"others": [],
		"server": get_psd_data(comp_psd, BD1_fileBasename(comp_psd))
	}
	
	//list psds in scene
	var elements_folder = scene.currentProjectPath() + "/elements/";
	var folders = BD1_ListFolders(elements_folder);
	
	folders.forEach(function(item){
		var element_path = elements_folder + item + "/";
		var psd = BD1_ListFiles(element_path, "*.psd")[0];
		if(!psd){
			return;
		}
		var psd_path = element_path + psd;
		//scene psd
		if(item.indexOf(projData.entity.name)	!= -1){
			if(psd_path == psds["main"]["file"]){
				return;
			}
			var data_item = get_psd_data(psd_path, item);
			data_item["widget"] = new QCheckBox(item);
			data_item.widget.checked = true;
			psds["copies"].push(data_item);
		} else {
			var data_item = get_psd_data(psd_path, item);
			data_item["widget"] = new QLabel(item);
			psds["others"].push(data_item);
		}
	});
	return psds;
}


//// proportions functions (update)
function get_psd_scale(data1, data2){

	var proportions = [get_proportion(data1), get_proportion(data2)];
	proportions.sort();
	var p = 1 - ((proportions[1] - proportions[0])/data1.width);
	return p;
}

function get_proportion(data){

	var frames = data.layers.filter(function(item){
		return item.layerPathComponents.indexOf("CENAS") != -1
	});
	frames.sort(function(a, b){ return b.width - a.width});
	var p = data.width - frames[0].width;
	return p.toFixed(3);
}