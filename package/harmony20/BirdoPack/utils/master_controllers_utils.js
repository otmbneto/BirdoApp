/*
	utils dos Scripts de Master Controllers da Birdo

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


/*
	lista com numero de prefixos (alfabeto maiusculo)
*/
var prefix_list = BD2_all_chars.slice(26, 52);

/*
	retorna valor das specs pro slider mc
*/
var checkbox_specs = '<specs>\n  <ports>\n    <in type=\"PEG\"/>\n    <out type=\"IMAGE\"/>\n  </ports>\n  <attributes>\n' +
	'    <attr type=\"DOUBLE\"     name=\"size\"                      value=\"0.2\" tooltip=\"Size of the Master Controller Checkbox.\"/>\n' +
	'    <attr type=\"COLOUR\"     name=\"on_color\"                  value=\"{ON_COLOR}\" tooltip=\"On state color.\"/>\n' +
	'    <attr type=\"COLOUR\"     name=\"off_color\"                 value=\"{OFF_COLOR}\" tooltip=\"Off state color.\"/>\n' +
	'    <attr type=\"BOOL\"       name=\"label_screen_space\"        value=\"false\" tooltip=\"Check this options for the label size to be in screen space.\"/>\n' +
	'    <attr type=\"STRING\"     name=\"label\"                     value=\"{LABEL}\" tooltip=\"Master Controller label.\"/>\n' +
	'    <attr type=\"STRING\"     name=\"label_font\"                value=\"{FONT}\" tooltip=\"Label font.\"/>\n' + 
	'    <attr type=\"DOUBLE\"     name=\"label_size\"                value=\"15.0\" tooltip=\"Label font size, in points.\"/>\n' + 
	'    <attr type=\"COLOUR\"     name=\"label_color\"               value=\"{LABEL_COLOR}\" tooltip=\"Label color.\"/>\n' +
	'    <attr type=\"COLOUR\"     name=\"label_bg_color\"            value=\"0,0,0,0\" tooltip=\"Label background color.\"/>\n' +
	'  </attributes>\n</specs>';

function get_checkbox_specs(on_color, off_color, label, font, labelcolor){
	var new_value = checkbox_specs.replace("{ON_COLOR}", on_color);
	new_value = new_value.replace("{OFF_COLOR}", off_color);	
	new_value = new_value.replace("{LABEL}", label);	
	new_value = new_value.replace("{FONT}", font);	
	new_value = new_value.replace("{LABEL_COLOR}", labelcolor);	
	return new_value;
}


/*
	retorna valor das specs pro slider mc
*/
var slider_specs = '<specs>\n  <ports>\n    <in type=\"PEG\"/>\n    <out type=\"IMAGE\"/>\n  </ports>\n  <attributes>\n' +
	'    <attr type=\"BOOL\"     name=\"invert\"                    value=\"{INVERT}\" tooltip=\"Flip slider direction.\"/>\n' +
    '    <attr type=\"BOOL\"     name=\"horizontal\"                value=\"{HORIZONTAL}\" tooltip=\"Horizontal slider layout.\"/>\n' +
	'    <attr type=\"BOOL\"     name=\"label_screen_space\"        value=\"false\" tooltip=\"Check this options for the label size to be in screen space.\"/>\n' +
	'    <attr type=\"BOOL\"     name=\"interpolate_poses\"         value=\"false\" tooltip=\"Allow fractional interpolation between frames.\"/>\n' +
	'    <attr type=\"STRING\"     name=\"label\"                     value=\"{LABEL}\" tooltip=\"Master Controller label.\"/>\n' +
	'    <attr type=\"STRING\"     name=\"label_font\"                value=\"{FONT}\" tooltip=\"Label font.\"/>\n' +
    '    <attr type=\"DOUBLE\"     name=\"widget_size\"               value=\"0.2\" tooltip=\"Radius of the slider handle.\"/>\n' +
	'    <attr type=\"DOUBLE\"     name=\"label_size\"                value=\"15.0\" tooltip=\"Label font size, in points.\"/>\n' +
	'    <attr type=\"DOUBLE\"     name=\"widget_val\"                value=\"0.0\" tooltip=\"Value of the slider.\"/>\n' +
	'    <attr type=\"COLOUR\"     name=\"frame_color\"               value=\"{FRAME_COLOR}\" tooltip=\"Color of the Slider Frame.\"/>\n' +
	'    <attr type=\"COLOUR\"     name=\"slider_color\"              value=\"{SLIDER_COLOR}\" tooltip=\"Color of the Slider Handle.\"/>\n' +
	'    <attr type=\"COLOUR\"     name=\"label_color\"               value=\"{LABEL_COLOR}\" tooltip=\"Label color.\"/>\n' +
	'    <attr type=\"COLOUR\"     name=\"label_bg_color\"            value=\"0,0,0,0\" tooltip=\"Label background color.\"/>\n' +
	'  </attributes>\n</specs>';
	
function get_slider_specs(invert, horizontal, label, font, framecolor, slidercolor, labelcolor){
	var new_value = slider_specs.replace("{INVERT}", invert);
	new_value = new_value.replace("{HORIZONTAL}", horizontal);	
	new_value = new_value.replace("{LABEL}", label);	
	new_value = new_value.replace("{FONT}", font);	
	new_value = new_value.replace("{FRAME_COLOR}", framecolor);	
	new_value = new_value.replace("{SLIDER_COLOR}", slidercolor);	
	new_value = new_value.replace("{LABEL_COLOR}", labelcolor);	
	return new_value;
}



/*
	create back drop 
*/
function add_backdrop(group, name){
	var pos = {x: null, y: null, w: 500, h: 400};
	var allbd = Backdrop.backdrops(group);
	allbd.forEach(function(item){
		if(pos.x == null && pos.y == null){
			pos["x"] = item.position.x;
			pos["y"] = item.position.y;
		}
		pos["x"] = item.position.x > pos.x ? item.position.x : pos.x;
		pos["y"] = item.position.y > pos.y ? item.position.y : pos.y;
	});
	pos["x"] = pos.x + 400;

	var corLetter = BD2_fromRGBAtoInt(204, 241, 92, 255);
	var corBackDrop = BD2_fromRGBAtoInt(181, 58, 205, 255);

	var newBackdrop = {
		position: {
			x: pos.x, 
			y: pos.y,
			w: pos.w,
			h: pos.h
		},
		title: {
			text: name,
			color: corLetter, 
			size: 14,
			font: "Arial"
		},
		description: {
			text: "",
			color: corLetter,
			size: 14,
			font: "Arial"
		},
		color: corBackDrop
	};

	Backdrop.addBackdrop(group, newBackdrop);
	return newBackdrop;
}


/*
	create mc master, check box nodes and backdrop
*/
function create_mcs_master(selection_data){
	//add backdrop
	var bd = add_backdrop(selection_data.rig_node, "MC - MASTER");
	var bdrect = new QRect(bd.position.x, bd.position.y, bd.position.w, bd.position.h);
	
	//add mc comp
	var cordC = new QPoint(bdrect.center().x() - 47, bdrect.y() + (Math.floor(bdrect.height()*3/4)));
	var comp = node.add(selection_data.rig_node, "comp_MC", "COMPOSITE", cordC.x(), cordC.y(), 0);
	
	//add mc node master
	var cordMC = new QPoint(bdrect.center().x() - Math.floor(bdrect.width()*1/4) - 48, bdrect.center().y());
	var mcMaster = create_mc(cordMC, "mc_Master", selection_data.rig_node);
	
	//add node 2
	var cordMCCB = new QPoint(bdrect.center().x() + Math.floor(bdrect.width()*1/4) - 48, bdrect.center().y());
	var mcCheckBox = create_mc(cordMCCB, "mc_Function", selection_data.rig_node);
	
	//todo: add aqui as conexoes desses nodes criados (achar destinos)
	
	return [mcCheckBox, mcMaster];
}

/*
	get initial rig selection data 
*/
function get_rig_selection(){
	var node_sel = selection.selectedNode(0);	
	if(!node_sel || !node.isGroup(node_sel)){
		MessageBox.warning("Selecione um rig valido!!",0,0);
		return false;
	}
	var rig_data = {};
	var rig_full_regex = /\w{3}\.(\w|\d)+-v\d+/;
	rig_data["rig_name"] = node.getName(node_sel).replace(/\w{2}(\d{3}|\d{4})_/, "");
	var rig_full = node.subNodes(node_sel).filter(function(item){ return rig_full_regex.test(node.getName(item));})[0];
	
	rig_data["rig_group"] = rig_full == "" ? node_sel : rig_full;	
	rig_data["script_folder_name"] = rig_full == "" ? node.getName(node_sel) : node.getName(node_sel).split("_")[0] + "-" + node.getName(rig_full).split("-")[1];
	
	//lista all nodes
	var allNodes = BD2_ListNodesInGroup(rig_data["rig_group"], "", true);
	var mcs = allNodes.filter(function(item){ return node.type(item) == "MasterController";});
	rig_data["node_list"] = allNodes;

	//find turn node
	var node_turn = allNodes.filter(function(item){
		return node.type(item) == "READ" && node.getName(item) == "TURN";
	})[0];	
	rig_data["turn_node"] = node_turn ? node_turn : null;
	if(!rig_data["turn_node"]){
		MessageBox.warning("Nao foi encontrado o node TURN neste rig! Crie um node drawing chamado 'TURN',\n" + 
		"e conecte ele em uma peg dentro da cabeca. Este node salvara as informacoes do Turn!",0,0);
		return false;
	}

	//get mcs data
	rig_data["mcs"] = difine_mcs(mcs);
	
	//find master peg
	var master_peg = null;
	var multiportin = node.getGroupInputModule(rig_data["rig_group"], "Multi-Port-In", 0, 0, 0);
	allNodes.forEach(function(item){
		if(node.type(item) == "PEG" && node.srcNode(item, 0) == multiportin){
			master_peg = item;
		}	
	});
	rig_data["master_peg"] = master_peg;
	return rig_data;
}
exports.get_rig_selection = get_rig_selection;


/*
	lista nodes selecionado pela timeline
*/
function get_selection_data(rig_data){
		
	var initial_node = selection.selectedNode(0);
	var ignore_list = ["COMPOSITE", "MasterController"];
	var sel_data = {
		start_frame: Timeline.firstFrameSel,
		end_frame: (Timeline.firstFrameSel + Timeline.numFrameSel - 1),
		nodes: []
	};
	//check if is selection range
	if(!selection.isSelectionRange()){
		MessageBox.warning("ERRO! Selecione mais de um frame na timeline pra criar um MC slider!",0,0);
		return false;
	}
	
	//avoid multiples node selection
	if(selection.selectedNodes().length > 1){
		MessageBox.warning("Selecione apenas um node na Timeline!",0,0);
		return false;
	}
	
	//check if selection is in rig 
	if(initial_node.indexOf(rig_data.rig_group) == -1){
		MessageBox.warning("ERRO! Selecao na timline nao corresponde com o RIG " +  rig_data.rig_name, 0,0);
		return false;
	}
	
	//force selection to nodes under
	Action.perform("onActionPropagateLayerSelection()", "timelineView");
	var selected = selection.selectedNodes();
	//check selection
	if(selected.length <= 1){
		MessageBox.warning("Invalid Selection! Select in the timeline the range of the animation to create MC parameters!",0,0);
		return false;
	}
	selected.sort(function(a,b){ return a.split("/").length - b.split("/").length;});
	selected.forEach(function(item, index){
		if(ignore_list.indexOf(node.type(item)) == -1){
			sel_data.nodes.push(item);
		}
	});

	//define se a selecao e da master peg
	sel_data["is_master"] = initial_node == rig_data.master_peg;
	
	return sel_data;
}
exports.get_selection_data = get_selection_data;

/* OLD
function get_create_coordinate(sel_nodes){//retorna coordenadas pra criacao da comp mc
	var sortedX = sel_nodes.sort(function(a,b){ return node.coordX(b) - node.coordX(a)});
	var sortedY = sel_nodes.sort(function(a,b){ return node.coordY(b) - node.coordY(a)});
	var w = node.coordX(sortedX[sortedX.length -1]) - node.coordX(sortedX[0]);
	var h = node.coordY(sortedY[sortedY.length -1]) - node.coordY(sortedY[0]);
	var full_rect = new QRect(node.coordX(sortedX[0]), node.coordY(sortedY[0]), w, h);
	var center = full_rect.center();
	return new Point2d(full_rect.right() + 200, center.y()-(h/4));	
}*/


function create_tbStateFile(stage_file, states){//cria arquivo tbState com states objects criados
	
	var sData = "[TB_StateManager]\n" + ("State Count:" + states.length + "\n");
	for(var i=0; i < states.length; ++i){
		sData += (states[i].toString(rigNode) + "\n");
	}
	
	var file = new File(stage_file);
	file.open( 2 ); //2=Write File Access
	file.write(sData);
	file.close();
	
	Print("File created: " + stage_file);
	return true;
}


/*
	cria lista de states pra incluir no state file 
	usando as configs da selection e filter atts
*/
function generate_selection_states(selection_data, filterAtts){
	var states = [];
	var nodes_data_list = get_nodes_data(selection_data, filterAtts);
	if(nodes_data_list.length == 0){
		Print("ERROR getting nodes data list!");
		return false;
	}
	for(var i = selection_data.start_frame; i<= selection_data.end_frame; i++){
		var state = new RigState("animatedState_" + i, i, nodes_data_list[0].path);
		nodes_data_list.forEach(function(item, index){ 
			if(index == 0){//ja foi criado o item 0
				return;	
			}
			state.addNodeAttrList(item.path, item.attributes, i);
		});
		states.push(state);
	}	
	return states;
}


/*
	retorna lista com objetos com info dos nodes (path e lista de atts) dos nodes listados
	- pode usar filtro pra nao pegar atts q nao mudam o valor;
*/
function get_nodes_data(sel_data, filter_atts){
	var node_data_list = [];
	sel_data.nodes.forEach(function(item){
		var ndata = get_individual_node_data(item, sel_data.start_frame, sel_data.end_frame, filter_atts);
		if(!ndata){
			return;
		}
		node_data_list.push(ndata);
	});
	return node_data_list;
}

/*
	cria objeto com info do node individual com attribute list  path e nome
*/
function get_individual_node_data(node_path, first_frame, last_frame, use_filter){
	var node_data = {
		name: node.getName(node_path),
		path: node_path,
		attributes: []	
	};
	var attList = node.getAttrList(node_path, first_frame, "").filter(function(att){
		var coluna = node.linkedColumn(node_path, att.fullKeyword());
		if(att.hasSubAttributes()){
			var subs = att.getSubAttributes();
			return subs.some(function(subAtt){
				coluna = node.linkedColumn(node_path, subAtt.fullKeyword());
				return validate_attribute(coluna, subAtt, first_frame, last_frame, use_filter);
			});
		}
		return validate_attribute(coluna, att, first_frame, last_frame, use_filter);
	});
	if(attList.length == 0){
		return false;
	}
	node_data["attributes"] = attList.map(function(item){ 
		if(item.fullKeyword() == "DRAWING"){
			return "DRAWING.ELEMENT";
		}
		return item.fullKeyword();
	});
	return node_data;
}

/*
	valida o attribute se ele serve pra ser incluido na lista
*/
function validate_attribute(colum, attribute, start_frame, end_frame, filter_atts){
	var start_value = attribute.fullKeyword() == "DRAWING.ELEMENT" ? column.getEntry(colum, 1, start_frame) : attribute.textValueAt(start_frame);
	if(!colum){
		return false;
	}
	if(!filter_atts){//se nao precisa filtar attrs q nao mudam
		return true;
	}
	for(var i = start_frame; i<=end_frame; i++){
		var value = attribute.fullKeyword() == "DRAWING.ELEMENT" ?   column.getEntry(colum, 1, i) : attribute.textValueAt(i);
		if(start_value != value){
			return true;
		}
	}
	return false;
}



/*
	cria um master controller node
*/
function create_mc(coord, mcName, parentGroup){
	return node.add(parentGroup, mcName, "MasterController", coord.x, coord.y, 0);
}

/*
	update mc node com opcoes escolhidas pela UI
*/
function update_mcNode(mcNode, options){
	
	//define script files type
	if(options.is_checkbox_mc){
		var scriptAtt = 'function onCheckboxValueChanged(params, checkedVal){\n' + 
		'  var targetNodes = params.targetNodes;\n' +	
		'  for(var i=0; i<targetNodes.length-1; i++){\n' +
		'    //head MCs\n' +
		'    node.showControls(targetNodes[i], checkedVal);\n' +
		'  }\n  //master mc\n' +
		'  node.showControls(targetNodes[targetNodes.length-1], !checkedVal);\n\n' +
		'  MessageLog.trace(\"Check box value is: \" + checkedVal);\n}\n' +
		'include(fileMapper.toNativePath(specialFolders.resource+\"/scripts/utilities/ui/functionWizard/mcs/mcCheckboxFunction.js\"));';
	} else {
		var scriptBaseName = BD1_fileBasename(options.scriptFile);
		var scriptAtt =  'include(fileMapper.toNativePath(scene.currentProjectPath()+\"/scripts/" + ' + scriptBaseName + '+ \"))';
	}

	//update script editor att
	var uiScriptAttr = node.getAttr(mcNode, 1,"uiScript.editor");
	uiScriptAttr.setValue(scriptAtt);
	
	//update ui data att
	var uiDataAttr = node.getAttr(mcNode,1,"uiData");
	uiDataAttr.setValue(JSON.stringify(options.uidata), null, 2);
	
	//difine specs type
	if(options.is_checkbox_mc){
		var specs = get_checkbox_specs(options.on_color, options.off_color, options.label, options.font, options.labelcolor);
	} else {
		var specs = get_slider_specs(options.invert, options.horizontal, options.label, options.font, options.framecolor, options.slidercolor, options.labelcolor);
	}
	//update specs
	var uiSpecsEditor = node.getAttr(mcNode, 1, "specsEditor");
	uiSpecsEditor.setValue(specs);
	
	//slider specific atts
	if(!options.is_checkbox_mc){
		//att files
		var colfile = node.linkedColumn(mcNode, "FILES");
		if(!colfile){
			colfile = column.generateAnonymousName();
			column.add(colfile, "FILE_LIBRARY");
			node.linkAttr(mcNode, "FILES", colfile);
		}
		var filesatt = options.scriptFile + "\n" + options.stageFiles.toString().replace(",", "\n");
		column.setEntry(colfile, 1, 1, filesatt);

		//create colum for widget value
		var colwidget = node.linkedColumn(mcNode, "widget_val");
		if(!colwidget){
			colwidget = column.generateAnonymousName();
			column.add(colwidget, "BEZIER");
			node.linkAttr(mcNode, "widget_val", colwidget);
		}
	}
	
	//Hack : Copy-paste the newly created node, to force-trigger its update with the new specs.
	var dragObj = copyPaste.copy([mcNode], frame.current(), 1, copyPaste.getCurrentCreateOptions());
	copyPaste.pasteNewNodes(dragObj, node.parentNode(mcNode), copyPaste.getCurrentPasteOptions());
	var sNewMCNodeCopy = selection.selectedNode(0);
	var sOriginalNameOnly = node.getName(mcNode);
	node.deleteNode(mcNode);
	node.rename(sNewMCNodeCopy, sOriginalNameOnly);

	return true;
}


/*
	retorna objeto com info dos mcs nodes achados no rig
*/
function difine_mcs(mcs_list){
	
	var sorted = mcs_list.sort();
	var mcs = {master: [], checkbox: null, extras: []};

	sorted.forEach(function(item){
		var object = {node: item, comp: findConnectedComp(item)};
		if(node.getName(item) == "mc_Master"){
			mcs["master"].push(object);
		} else if(node.getName(item) == "mc_Function"){
			mcs["checkbox"] = object;
		} else {
			mcs["extras"].push(object);
		}
	});
	//check results:
	if(mcs.extras.length == 0){
		Print("Nenhum mc extra foi encontrado!");
	}
	if(mcs.master.length == 0){
		Print("Nao foi encontrado o Mc Master!!");
	}
	if(!mcs.checkbox){
		Print("Nao foi encontrado o Mc Checkbox!!");
	}
	return mcs;
}

/*
	retorna composite q o nodeP esta conectado
*/
function findConnectedComp(nodeP){
	var comp = node.dstNode(nodeP, 0, 0);
	while(comp){
		if(node.type(comp) == "COMPOSITE"){
			return comp;
		}
		comp = node.dstNode(comp, 0, 0);
	}
	Print("ERRO! No comp found for node: " + nodeP);
	return false;
}

/*
	cria objeto com info das poses do turn baseado nas escolhas da UI
*/
function createTurn(startFrame, endFrame, front, back, fliped){

	var turn_data = {};
	var duracao = endFrame - (startFrame-1);
	var turn_type = front == startFrame ? "foward" : "front_middle";//define se a pose front fica no inicio ou no meio
	var middle = Math.round((duracao-1)/2) + 1;
	var msg = "Turn Invalido! Marque corretamente as informacoes\ndo Turn. As opcoes sao:\n\n -1): (FRONT---BACK---) - Selecao de frames PAR;\n -2): (BACK---FRONT---BACK) - Selecao de frames IMPAR;";
	//check if info is valid
	if(turn_type == "foward"){
		if(back != middle || duracao%2 != 0){
			MessageBox.warning(msg,0,0);
			return false;
		}
		//reduz prefix list para ordem certa
		var reduced_list = prefix_list.slice(0, duracao).split("");
		if(fliped){
			reduced_list = prefix_list.slice(0, middle).split("").concat(prefix_list.slice(1, middle-1).split("").reverse());
		}
	} else if (turn_type == "front_middle"){
		if((back != startFrame && back != endFrame) || duracao%2 == 0 || front != middle){
			MessageBox.warning(msg,0,0);
			return false;
		}
		//reduz prefix list para ordem certa
		var reduced_list = prefix_list.slice(0, middle).split("").reverse().concat(prefix_list.slice(middle, duracao).split(""));
		if(fliped){
			reduced_list = prefix_list.slice(0, middle).split("").reverse().concat(prefix_list.slice(1, middle).split(""));
		}
	}

	reduced_list.forEach(function(item, index){
		var frame = index + 1;
		turn_data[frame] = item;
	});
	Print("Turn Type is: '" + turn_type + "' and fliped: " + fliped);
	return turn_data;
}