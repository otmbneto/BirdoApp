/*
	utils dos Scripts de Master Controllers da Birdo

*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


/*
	return scene scripts folder (creates if dont exist)
*/
function getSceneScriptFolder(){
	var folder = scene.currentProjectPath() + "/scripts/";	
	if(!BD1_DirExist(folder)){
		BD1_makeDir(folder);
	}
	return folder;
}

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
	'    <attr type=\"COLOUR\"     name=\"label_bg_color\"            value=\"{BG_COLOR}\" tooltip=\"Label background color.\"/>\n' +
	'  </attributes>\n</specs>';

function get_checkbox_specs(on_color, off_color, label, font, labelcolor, bg_color){
	var new_value = checkbox_specs.replace("{ON_COLOR}", on_color);
	new_value = new_value.replace("{OFF_COLOR}", off_color);	
	new_value = new_value.replace("{LABEL}", label);	
	new_value = new_value.replace("{FONT}", font);	
	new_value = new_value.replace("{LABEL_COLOR}", labelcolor);	
	new_value = new_value.replace("{BG_COLOR}", bg_color);
	return new_value;
}


/*
	retorna valor das specs pro slider mc
*/
var slider_specs = '<specs>\n  <ports>\n    <in type=\"PEG\"/>\n    <out type=\"IMAGE\"/>\n  </ports>\n  <attributes>\n' +
	'    <attr type=\"BOOL\"     name=\"invert\"                    value=\"false\" tooltip=\"Flip slider direction.\"/>\n' +
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
	
function get_slider_specs(horizontal, label, font, framecolor, slidercolor, labelcolor){
	var new_value = slider_specs.replace("{HORIZONTAL}", horizontal);
	new_value = new_value.replace("{LABEL}", label);	
	new_value = new_value.replace("{FONT}", font);	
	new_value = new_value.replace("{FRAME_COLOR}", framecolor);	
	new_value = new_value.replace("{SLIDER_COLOR}", slidercolor);	
	new_value = new_value.replace("{LABEL_COLOR}", labelcolor);	
	return new_value;
}

/*
	UI script string value for CHECKBOX
*/
function getUiCheckBoxScriptValue(master_count){
	var script_ui_CheckBox = 'function onCheckboxValueChanged(params, checkedVal){\n  var master_count = params.targetNodes.length - ' + master_count + '; //index of master MCs\n' + 
	'  //loop to show MCs\n  for(var i=0; i<params.targetNodes.length; i++){\n    var mc = params.targetNodes[i];\n    ' + 
	'if(i >= master_count) {//if master\n      node.showControls(mc, !checkedVal);\n    } else {\n      node.showControls(mc, checkedVal);\n    }\n  }\n  ' + 
	'MessageLog.trace("Check box value is: " + !checkedVal);\n}\n\n' + 
	'include(fileMapper.toNativePath(specialFolders.resource+"/scripts/utilities/ui/functionWizard/mcs/mcCheckboxFunction.js"))';
	return script_ui_CheckBox;
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
	retorna o backdrop e comp de mc do grupo dado (se nao existir, cria)
*/
function find_backdrop_mc(group, name){
	var output = {backdrop: null, comp: null};
	var allbd = Backdrop.backdrops(group);
	var mc_reg = /(MASTER|MC)/;
	var mc_bds = allbd.filter(function(item){
		var title = item.title.text
		return title.indexOf("FULL") == -1 && mc_reg.test(title);
	});
	if(mc_bds.length == 0){
		Print("No backdrop mc found in group: " + group + "... will need to create!");
		output["backdrop"] = add_backdrop(group, name);
	}else {
		output["backdrop"] = mc_bds[0];
	}
	var allcomps = BD2_ListNodesInGroup(group, ["COMPOSITE"], true);
	var bdpos = output["backdrop"].position;
	var bd_rect = new QRect(bdpos.x, bdpos.y, bdpos.w, bdpos.h);
	var comp = allcomps.filter(function(item){
		var nodeRect =	BD2_createRectCoord(item);
		return bd_rect.contains(nodeRect);
	});
	//cria comp se necessario
	if(comp.length == 0){
		//add mc comp
		var cordC = new QPoint(bd_rect.center().x() - 47, bd_rect.y() + (Math.floor(bd_rect.height()*3/4)));
		output["comp"] = node.add(group, "comp_MC", "COMPOSITE", cordC.x(), cordC.y(), 0);
		//find dst comp 
		var dstComp = allcomps.sort(function(a,b){ return node.coordY(b) - node.coordY(a)})[0];
		//link nodes
		node.link(output["comp"], 0, dstComp, 0, false, true); 
		//BD2_connectWithWaypoint(output["comp"], dstComp, true);
	} else {
		output["comp"] = comp[0];
	}
	return output;
}

/*
	create mc node with backdrop if dont exist
*/
function add_mc(group_node, name){
	//add backdrop
	var base_setup = find_backdrop_mc(group_node, name.toUpperCase());
	var bdpos = base_setup.backdrop.position;
	var bdrect = new QRect(bdpos.x, bdpos.y, bdpos.w, bdpos.h);
	
	//number of mcs in comp
	var mc_number =  node.numberOfInputPorts(base_setup.comp);
	var desloc = (Math.floor(bdrect.width()/4) * mc_number) + 15;
	
	//add mc node master
	var cordMC = new QPoint(bdrect.x() + desloc, bdrect.center().y());
	var mc_node = create_mc(cordMC, name, group_node);
	base_setup["mc_node"] = mc_node;
	
	//add static
	var staticnode = node.add(group_node, "st-" + name, "StaticConstraint", 0, 0, 0);
	node.setCoord(staticnode, (cordMC.x() + (node.width(mc_node)/2))- (node.width(staticnode)/2), cordMC.y() - 75);	
	
	//node de saida do grupo
	var outputNode = node.getGroupInputModule(group_node, "Multi-Port-In", 0, 0, 0);
	
	//link nodes
	node.link(mc_node, 0, base_setup.comp, 0, false, true); 
	node.link(outputNode, 0, staticnode, 0, false, false);
	//node.link(staticnode, 0, mc_node, 0, false, false); NAO funciona pq o mc node ainda é saida de imagem e nao de peg
	
	base_setup["static_node"] = staticnode;

	return base_setup;
}
exports.add_mc = add_mc;


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
	//add all nodes to one list
	rig_data["mcs"]["all"] = mcs;
	
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
	var suported_list = ["PEG", "READ", "OffsetModule", "CurveModule"]; // ADD new types to this list if necessary!
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
		if(suported_list.indexOf(node.type(item)) != -1){
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

/*
	atualiza o arquivo stage com as infos da selecao (usar filtro true para os extras e false para as masters)
*/
function update_states(stage_file, selection_data, parent_node, filter_atts){
	
	var states = generate_selection_states(selection_data, filter_atts);
	var sData = "[TB_StateManager]\n" + ("State Count:" + states.length + "\n");
	for(var i=0; i < states.length; ++i){
		sData += (states[i].toString(parent_node) + "\n");
	}
	var script_version_dir = BD1_dirname(stage_file);
	if(!BD1_DirExist(script_version_dir)){
		BD1_makeDir(script_version_dir);		
	}
	if(BD1_FileExists(stage_file)){
		Print("-- arquivo existia e foi deletado para ser atualizado: " + stage_file);
		BD1_RemoveFile(stage_file);
	}
	var file = new File(stage_file);
	file.open( 2 ); //2=Write File Access
	file.write(sData);
	file.close();
	
	Print("File created: " + stage_file);
	return true;
}
exports.update_states = update_states;


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
	return node.add(parentGroup, mcName, "MasterController", coord.x(), coord.y(), 0);
}

/*
	update mc node com opcoes escolhidas pela UI
*/
function update_mcNode(mcNode, options){
	
	//define script files type
	if(options.is_checkbox_mc){
		var scriptAtt = options.scriptFile;
		var specs = get_checkbox_specs(options.on_color, options.off_color, options.label, options.font, options.labelcolor, options.bg_color);

	} else {
		var scriptBaseName = BD1_fileBasename(options.scriptFile);
		var scriptAtt = 'include(fileMapper.toNativePath(scene.currentProjectPath()+"/scripts/' + scriptBaseName + '"))';
		var specs = get_slider_specs(options.horizontal, options.label, options.font, options.framecolor, options.slidercolor, options.labelcolor);

	}

	//update script editor att
	var uiScriptAttr = node.getAttr(mcNode, 1,"uiScript.editor");
	uiScriptAttr.setValue(scriptAtt);
	
	//update ui data att
	var uiDataAttr = node.getAttr(mcNode,1,"uiData");
	uiDataAttr.setValue(JSON.stringify(options.uidata, null, 1));
	
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
		var filesatt = "scripts/" + scriptBaseName + "\n" + options.stageFiles.toString().replace(/,/g, "\n");
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
	BD2_updateNode(mcNode);
	
	node.showControls(mcNode, false);

	return true;
}
exports.update_mcNode = update_mcNode;

/*
	retorna objeto com info dos mcs nodes achados no rig
*/
function difine_mcs(mcs_list){
	
	var sorted = mcs_list.sort();
	var mcs = {master: [], checkbox: null, extras: []};

	sorted.forEach(function(item){
		var object = {node: item, comp: findConnectedComp(item), peg: findConnectedPeg(item)};
		if(node.getName(item).indexOf("mc_Master") != -1){
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
	retorna peg ou static conectado ao node
*/
function findConnectedPeg(nodeP){
	var peg = node.srcNode(nodeP, 0);
	while(peg){
		if(node.type(peg) == "PEG" || node.type(peg) == "StaticConstraint"){
			return peg;
		}
		peg = node.srcNode(peg, 0);
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
	var middle = Math.round((duracao-1)/2);
	var msg = "Turn Invalido! Marque corretamente as informacoes\ndo Turn. As opcoes sao:\n\n -1): (FRONT---BACK---) - Selecao de frames PAR;\n -2): (BACK---FRONT---BACK) - Selecao de frames IMPAR;";
	//check if info is valid
	if(turn_type == "foward"){
		if(back != (startFrame + middle) || duracao%2 != 0){
			MessageBox.warning(msg,0,0);
			return false;
		}
		//reduz prefix list para ordem certa
		var reduced_list = prefix_list.slice(0, duracao).split("");
		if(fliped){
			reduced_list = prefix_list.slice(0, middle).split("").concat(prefix_list.slice(1, middle-1).split("").reverse());
		}
	} else if (turn_type == "front_middle"){
		if((back != startFrame && back != endFrame) || duracao%2 == 0 || front != (startFrame + middle)){
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
		var frame = startFrame + index;
		turn_data[frame] = item;
	});
	Print("Turn Type is: '" + turn_type + "' and fliped: " + fliped);
	return turn_data;
}
exports.createTurn = createTurn;


/*
	atualiza o node de turn com as infos fornecidas 
*/
function modify_turn_node(turn_data, turn_node){
	
	var d_column = node.linkedColumn(turn_node, "DRAWING.ELEMENT");
	
	scene.beginUndoRedoAccum("[MC Manager] modify TURN node");	
	
	for(fr in turn_data){
		if(!column.setEntry(d_column, 1, fr, turn_data[fr])){	
			Print(" - ERROR setting turn node to " + turn_data[fr] + " at fr: " + fr);
			scene.cancelUndoRedoAccum();
			return false;
		}
		Print(" -- turn node changed to " + turn_data[fr] + " at frame: " + fr);
	}

	scene.endUndoRedoAccum();
	return true;
}
exports.modify_turn_node = modify_turn_node;


/*
	return birdo mc script files
*/
function get_script_files(projData){
	return {
		slider_special: projData["paths"]["birdoPackage"] + "utils/BD_mcInterpolationSlider_215.js",
		slider_standard: projData["paths"]["birdoPackage"] + "utils/mcInterpolationSlider_215.js"
	}		
}
exports.get_script_files = get_script_files;


/*
	seta cor do butao e retorna o objeto da current color
*/
function setButtonColor(button){
	var curr_cor = BD2_get_current_color();
	if(!curr_cor){
		MessageBox.warning("Nenhuma cor selecionada!",0,0);
		return false;
	}
	var css_color = BD2_GetColorValues(curr_cor.id, true);	
	button.styleSheet = "background : " + css_color;
	return css_color.replace(/(rgb\(|\);|\s)/g, "");//formated to only values
}
exports.setButtonColor = setButtonColor;

/*
	apply MC static position
*/
function applyMCStaticPosition(read_nodes, staticNode, mc_type, index){
	var rect = getReadsBox(read_nodes);
	var side = mc_type == "MASTER" ? "bottom" : mc_type == "CHECKBOX" ? "top" : index%2 == 0 ? "left" : "rigth";
	var desloc = {x: 2 * index, y: 0.75 * index};
	var valueX = side == "top" || side == "bottom" ? rect.center().x() : side == "left" ? rect.x0 - 1 - desloc.x : rect.x1 + 1 + desloc.x;
	var valueY = side == "left" || side == "rigth" ? rect.center().y() + 1 : side == "top" ? rect.y1 + 1 + desloc.y : rect.y0 - 1 - desloc.y;
	var xAtt = node.getAttr(staticNode, 1, "translate.X");
	var yAtt = node.getAttr(staticNode, 1, "translate.Y");
	var activeAtt = node.getAttr(staticNode, 1, "active");
	xAtt.setValue(valueX);
	yAtt.setValue(valueY);
	activeAtt.setValue(true);

	Print("Set translate pos x : " + valueX + " pos Y : " + valueY);
}

/*
	constructor to creates a box Object
*/
function Box(boxObject){
	//valor pra converter de drawing coord to peg coord
	this.toPegX = 208.25;
	this.toPegY = 156.19;
	
	this.x0 = boxObject.x0/this.toPegX;
	this.x1 = boxObject.x1/this.toPegX;
	this.y0 = boxObject.y0/this.toPegY;
	this.y1 = boxObject.y1/this.toPegY;

	this.width = function(){
		return this.x1 - this.x0;
	}
	this.height = function(){
		return this.y1 - this.y0;
	}
	this.center = function(){
		var x = this.x0 + (this.width()/2);
		var y = this.y0 + (this.height()/2);
		return new QPoint(x, y);
	}
};

/*
	retorna box de todos nodes reads da lista
*/
function getReadsBox(read_list){
	var final_pos = {
		x0: 0,
		x1: 0,
		y0: 0,
		y1: 0
	};
	for(var i=0; i<read_list.length; i++){
		var node_box = getNodeBox(read_list[i]);
		if(!node_box){
			continue;
		}
		final_pos["x0"] = Math.min(final_pos["x0"], node_box.x0);
		final_pos["x1"] = Math.max(final_pos["x1"], node_box.x1);
		final_pos["y0"] = Math.min(final_pos["y0"], node_box.y0);
		final_pos["y1"] = Math.max(final_pos["y1"], node_box.y1);
	}
	return new Box(final_pos);
}

/*
	retorna box dos drawings do node
*/
function getNodeBox(node_path){
	var currentDrawing = Drawing.Key({node : node_path, frame : frame.current()});
	var config = {
		drawing  : currentDrawing
	};
	var data = Drawing.query.getData(config); 
	var box = data.box;
	if(!box || box.hasOwnProperty("empty")){
		return false;
	}
	return box;
}

/*
	create mc callbacks
*/
function createMCObjectCallbacks(self, mc_data, type, index){
	
	var mc_name = mc_data.widgets.name.text;
	
	//update combo types
	mc_data["widgets"]["turn_type"].clear();
	mc_data["widgets"]["turn_type"].addItems(mc_data["turn_types"]);	
	
	//callback do botao de cor 1
	var setColor1 = function(){
		var corButton = mc_data.widgets.color1;
		var cor1 = setButtonColor(corButton);
		if(!cor1){
			Print("No color found..");
			return;
		}
		mc_data["slider"]["color1"] = cor1;
		
		//update action button enable state
		var valid_selection = Boolean(mc_data.turn_data) && Boolean(mc_data.selection);
		var valid_colors = Boolean(mc_data["slider"]["color1"]) && Boolean(mc_data["slider"]["color2"]);
		mc_data.widgets.action.enabled = valid_colors && valid_selection;
		
		Print("Color 1 " + mc_name + " set to " + cor1);
		mc_data.widgets.status.text = "Cor 1 escolhida!";
	}
	//callback do botao de cor 2
	var setColor2 = function(){
		var corButton = mc_data.widgets.color2;
		var cor2 = setButtonColor(corButton);
		if(!cor2){
			Print("No color found..");
			return;
		}
		mc_data["slider"]["color2"] = cor2;
		
		//update action button enable state
		var valid_selection = Boolean(mc_data.turn_data) && Boolean(mc_data.selection);
		var valid_colors = Boolean(mc_data["slider"]["color1"]) && Boolean(mc_data["slider"]["color2"]);
		mc_data.widgets.action.enabled = valid_colors && valid_selection;
		
		Print("Color 2 " + mc_name + " set to " + cor2);
		mc_data.widgets.status.text = "Cor 2 escolhida!";
	}
	
	//se for extras e tiver group comboGroup
	if("group_combo" in mc_data.widgets){
		var filteredGroupNodes = self.all_nodes.filter(function(item){ return node.isGroup(item) && !/(\/Def|PATCH|Patch)/.test(item)});
		filteredGroupNodes.sort(function(a,b){return a.length - b.length});
		filteredGroupNodes.unshift(self.rig_group);
		var modList = filteredGroupNodes.map(function(item){ 
			if(item == self.rig_group){
				return "~/MASTER";
			}
			return item.replace(self.rig_group, "~");
		});

		mc_data.widgets.group_combo.clear();
		mc_data.widgets.group_combo.addItems(modList);		
		var selectGroupCallback = function(){
			//update group info in mc data
			var selectedGroup = filteredGroupNodes[mc_data.widgets.group_combo.currentIndex];
			mc_data["group_node"] = selectedGroup;
			Print("Selected Group: " + selectedGroup);
		}
		mc_data.widgets.group_combo["currentIndexChanged(QString)"].connect(self, selectGroupCallback);
		
	}
	
	//callback do action button
	var action_callback = function(){
		try{
			Print("start action " + mc_name);
			if(!mc_data.group_node){
				MessageBox.warning("Defina o grupo de destino!",0,0);
				return;			
			}
			if(!mc_data.turn_data){
				MessageBox.warning("Algo deu errado! O Turn ainda nao foi denifido!",0,0);
				return;
			}
			
			//begin undo
			scene.beginUndoRedoAccum("[MC Manager] Action - " + mc_name);

			//update turn node if necessary
			if(type == "EXTRAS"){
				checkExtraSelectionTurnNode(self, mc_data);
			}

			if(!mc_data.node){//cria o mc
				var created = add_mc(mc_data.group_node, mc_name);
				Print("Created nodes: ");
				Print(created);
				//update main object info
				mc_data["node"] = created.mc_node;
				mc_data["comp"] = created.comp;
				mc_data["peg"] = created.static_node;
				//change button text to update
				mc_data.widgets.action.text = "Update";
				//update mc count 
				var status_label = type == "MASTER" ? self.ui.groupInfo.labelMCMasterCount : self.ui.groupInfo.labelMCExtraCount;
				status_label.text = parseFloat(status_label.text) + 1;
				
				//update peg (static) position:
				var read_nodes = mc_data.selection.nodes.filter(function(item){ return node.type(item) == "READ"});
				applyMCStaticPosition(read_nodes, mc_data["peg"], type, index);
			}

			//update node info
			var scriptFile = type == "MASTER" ? self.scripts.slider_standard : self.scripts.slider_special;
			var statesFiles_list = get_states_files(self, type, mc_data);
			var ui_data = get_ui_data(self, type, mc_data, statesFiles_list);
			
			var options = {
				is_checkbox_mc : false,
				scriptFile: scriptFile,
				uidata: ui_data,
				stageFiles: statesFiles_list,
				horizontal: mc_data.slider.horizontal,
				label: (type == "MASTER" ? "" : mc_name.replace("mc_", "")),
				font: self.font,
				framecolor: mc_data.slider.color2,
				slidercolor: mc_data.slider.color1,
				labelcolor: mc_data.slider.color1
			}
			
			try{//update node mc files
				//copia arquivo de script
				var scriptBaseName = BD1_fileBasename(scriptFile);
				var script_folder =	getSceneScriptFolder();
				var scene_script_path = script_folder + scriptBaseName;
				if(!BD1_CopyFile(scriptFile, scene_script_path)){
					MessageBox.warning("Erro copiando o arquivo de script: " + scriptBaseName + " para o script folder da cena",0,0);
				}
				//update states files
				var filter_atts = type == "EXTRAS";
				if(type == "MASTER" || statesFiles_list.length == 1){//se for master ou extra simples
					var stage_file = scene.currentProjectPath() + "/" + statesFiles_list[0];
					update_states(stage_file, mc_data.selection, mc_data.group_node, filter_atts);
				} else {//modifica cada state pra cada pose do EXTRA advanced
					for(item in mc_data.turn_data){
						var stage_file = mc_data.turn_data[item].state_file;
						update_states(stage_file, mc_data.turn_data[item].selection, mc_data.group_node, filter_atts);
					}
				}
			} catch(e){
				Print("Update Files failed!");
				Print(e);
			}
			
			try{//update node mc atts
				update_mcNode(mc_data.node, options);
				node.showControls(mc_data.node, true);
			} catch(e){
				Print("Update mc node error!");
				Print(e);	
			}
			
			//conecta o  mc node ao static
			node.link(mc_data.peg, 0, mc_data.node, 0, false, false);
			
			Print("End action : " + mc_name);
			
			mc_data.widgets.status.text = "Mc node Updated!";

			if(type == "MASTER" && index == 0){
				//update enable extras tab
				self.ui.tabWidget.setTabEnabled(1, true);
				//update master_turn data
				var extraTab = self.ui.tabWidget.widget(1);
				create_turn_widget(self, mc_data.turn_data, extraTab);
			}
			
			scene.endUndoRedoAccum();
			
		} catch(e){
			Print(e);
			Print("Action failed!");
		}	
	};
	//selection callback
	var select_callback = function(){
		Print("Callback selection " + mc_name);
		try{	
			self.select_mc(type, index);
		} catch(e){
			Print(e);
			Print("Selection error!");
		}
	};
	mc_data.widgets.color1.clicked.connect(self, setColor1);
	mc_data.widgets.color2.clicked.connect(self, setColor2);
	
	mc_data.widgets.action.clicked.connect(self, action_callback);
	mc_data.widgets.select.clicked.connect(self, select_callback);
	
	Print("End callback creation for :  " + mc_name);
}
exports.createMCObjectCallbacks = createMCObjectCallbacks;

/*
	cria as widgets de turn na tab 2 (extras) com cada selecao do turn do MC Master
*/
function create_turn_widget(self, turn_data, extraTab){
	var gridLayout = extraTab.groupTurn.layout();
	self.master_turn = {};
	Object.keys(turn_data).forEach(function(item, index){
		var pose = turn_data[item];
		if(pose in self.master_turn){
			return;
		}
		var radioBox = new QRadioButton(pose, extraTab.groupTurn);
		radioBox.autoExclusive = false;
		var label = new QLabel("null", extraTab.groupTurn);
		label.setFrameStyle(QFrame.Box | QFrame.Plain);
		label.enabled = false;
		gridLayout.addWidget(radioBox, index, 0, Qt.AlignTop);
		gridLayout.addWidget(label, index, 1, Qt.AlignTop);
		
		//callback da checkbox (somente habilita a label)
		radioBox.toggled.connect(self, function(){
			var curr_mc = self.getCurrent_mc();
			if(!curr_mc){
				Print("no current mc selected!");
				return;
			}
			if(radioBox.checked){
				var name_clean = curr_mc.mc_name.replace("mc_", "");
				var l_text = extraTab.comboType.currentText == "Advanced" ? name_clean + pose + ".tbState" : name_clean + ".tbState";
			} else {
				var l_text = "null";
			}
			label.text = l_text;
			label.enabled = radioBox.checked;
			Print("Pose " + pose + " => " + l_text);
		});
		self.master_turn[pose] = {cb: radioBox, state_label: label};
	});
	//set seccond column stretch to 2
	gridLayout.setColumnStretch(1, 2);
}

/*
	adiciona um novo objeto de mc no EXTRAS (cria radiobutton);
*/
function createExtraObject(self, extrasPage, mc_name, index){
	var scrollWidget = extrasPage.groupExtrasList.scrollRadioList.widget();
	var gridLayout = scrollWidget.layout();
	var radioButton = new QRadioButton(scrollWidget);
	radioButton.text = mc_name;
	gridLayout.addWidget(radioButton, index, 0, Qt.AlignTop);
	
	//states widgets list
	var states_widgets = Object.keys(self.master_turn).map(function(item){return self.master_turn[item].state_label});
	//update line name with mc name
	extrasPage.lineName.text = mc_name;

	radioButton.toggled.connect(self, function(){
		//habilita widgets
		extrasPage.groupTurn.enabled = true;
		extrasPage.pushSelectTLExtra.enabled = true;
		extrasPage.comboType.enabled = true;
		
		//reseta current selection
		if(radioButton.checked){
			self.current_selection = null;
			self.current_selection = {
				type: "EXTRAS",
				index: index
			};
			extrasPage.pushSelectTLExtra.enabled = true;
			extrasPage.comboType.enabled = true;
			extrasPage.labelStatus.text = "mc selected: " + mc_name;
			
			//atualiza callbacks 
			var curr_mc = self.getCurrent_mc();
			createMCObjectCallbacks(self, curr_mc, "EXTRAS", index);
			extrasPage.pushAction.text = Boolean(curr_mc.node) ? "Update" : "Create";
		}
		Print("current selection is: ");
		Print(self.current_selection);
	});
	
	//obs: todo objeto de extra criado, tem as mesmas widgets na tab 2, q mudam de connect toda vez q muda a selecao do radio do mc
	return {
		mc_name: mc_name,
		node: null,
		peg: null,
		comp: null,
		group_node: null,
		turn_types: ["Advanced", "Simple"],
		turn_data: null,
		selection: null,
		slider: {
			horizontal: false,
			color1: null,
			color2: null
		},
		widgets: {
			radio: radioButton,
			color1: extrasPage.pushCor1,
			color2: extrasPage.pushCor2,
			name: extrasPage.lineName,
			states: states_widgets,
			group_combo: extrasPage.comboGroup,
			turn_type: extrasPage.comboType,
			action: extrasPage.pushAction,
			select: extrasPage.pushSelectTLExtra,
			status: extrasPage.labelStatus
		}
	};
}
exports.createExtraObject = createExtraObject;

/*
	check if turn is in EXTRA mc selection and change node exposure to fit pose selection
*/
function checkExtraSelectionTurnNode(self, mc_data){
	for(pose in mc_data.turn_data){
		var pose_selection = mc_data.turn_data[pose].selection;
		if(pose_selection.nodes.indexOf(self.turn_node) != -1){
			var d_column = node.linkedColumn(self.turn_node, "DRAWING.ELEMENT");
			for(var f=pose_selection.start_frame; f<=pose_selection.end_frame; f++){
				column.setEntry(d_column, 1, f, pose);
				Print("Node turn changed to " + pose + " at frame " + f);
			}			
		}
	}
}

/*
	return used state files list for each case
*/
function get_states_files(self, type, mc_data){
	var state_list = [];
	if(type == "EXTRAS"){
		for(pose in mc_data.turn_data){
			var stateFileName = mc_data.turn_data[pose].state_name;
			var stateFile = ["scripts", self.script_folder_name, stateFileName].join("/");
			if(state_list.indexOf(stateFile) == -1){
				state_list.push(stateFile);
			}
		}
	} else {
		state_list.push(["scripts", self.script_folder_name, mc_data.widgets.states[0].text].join("/"));	
	}
	return state_list;
}	

/*
	create mc ui_data object att to ui_data mc node
*/
function get_ui_data(self, type, mc_data, statesFiles_list){
	if(type == "EXTRAS"){
		var ui_data = {
			"node_ref" : self.turn_node.replace(mc_data.group_node, "~"),
			"files": {},
			"poses": null,
			"location":"scn"
		};
		var name_clean = mc_data.mc_name.replace("mc_", "");
		for(pose in mc_data.turn_data){
			var stateName = mc_data.turn_data[pose].state_name;
			ui_data["files"][pose] = ["/scripts", self.script_folder_name, stateName].join("/");
		}
	} else {//if MASTER
		var ui_data = {"poses": "/"+statesFiles_list[0],"location":"scn"};	
	}
	return ui_data;
}

/*
	cria objeto com info dos states
*/

/*
	get ui_data do checkbox
*/
function get_checkbox_uidata(self, group_master){
	var ui_data = {
	  "targetNodes": [],
	  "operationType": "Show/Hide Node Controls",
	  "label": "mc_Function",
	  "createKeyframes": false
	};
	self.mc_data.EXTRAS.forEach(function(item){
		if(!item.node){
			return;
		}
		ui_data["targetNodes"].push(item.node.replace(group_master, "~"));
	});
	self.mc_data.MASTER.forEach(function(item){
		if(!item.node){
			return;
		}
		ui_data["targetNodes"].push(item.node.replace(group_master, "~"));
	});
	return ui_data;
}

/*
	cria mc_data dos mcs EXTRAS nodes existentes encontrados no rig
*/
function addMCsNodesToMainObject(self, extrasPage, mc_list){
	if(mc_list.length == 0){
		Print("No need to create EXTRAS mcs objects!");
		return;
	}
	try{	
		//create extra mc objects
		for(var i=0; i<mc_list.length; i++){
			var mc_object = mc_list[i];
			var mc_name = node.getName(mc_object.node);
			var mc_extra = utils.createExtraObject(self, extrasPage, mc_name, i);
			mc_extra["mc_name"] = mc_name;
			mc_extra["node"] = mc_object.node;	
			mc_extra["peg"] = mc_object.peg;	
			mc_extra["comp"] = mc_object.comp;
			//update main object
			self.mc_data["EXTRAS"].push(mc_extra);
			Print("Extra MC object created: " + mc_extra["node"]);
		}
	} catch(e){
		Print(e);
		MessageBox.warning("ERROR creating existing EXTRAS mcs objects!",0,0);
		return;
	}
}
exports.addMCsNodesToMainObject = addMCsNodesToMainObject;

/*
	update checkbox mc
*/
function updateCheckBoxMC(self, mainTab){
	
	//check if exist mcs in the rig
	if(self.mc_data.MASTER.length == 0 && self.mc_data.EXTRAS.length == 0){
		MessageBox.warning("Ainda nao existem mcs neste RIG! Somente é possivel editar o CHECKBOX quando houverem MCs criados!",0,0);
		Print("Update/Create CHECKBOX canceled...");
		return;			
	}
	
	//begin undo
	scene.beginUndoRedoAccum("[MC Manager] Update CHeckBox MC ");

	var cb_data = self.mc_data.CHECKBOX;	
	var group_node = self.mc_data.MASTER[0].group_node;
	if(!cb_data.node){//cria o checkbox mc
		var created = add_mc(group_node, "mc_Function");
		Print("Created checkbox node: ");
		Print(created);
		//update main object info
		self.mc_data["CHECKBOX"]["node"] = created.mc_node;
		self.mc_data["CHECKBOX"]["comp"] = created.comp;
		self.mc_data["CHECKBOX"]["peg"] = created.static_node;
		//change button text to update
		mainTab.pushMCcheckbox.text = "Update CheckBox";
	
		//update peg (static) position:
		var read_nodes = self.all_nodes.filter(function(item){ return node.type(item) == "READ"});
		applyMCStaticPosition(read_nodes, created.static_node, "CHECKBOX", 0);
	}
	
	//update node info
	var scriptFile = getUiCheckBoxScriptValue(self.ui.groupInfo.labelMCMasterCount.text);
	var ui_data = get_checkbox_uidata(self, group_node);
	
	var options = {
		is_checkbox_mc : true,
		scriptFile: scriptFile,
		uidata: ui_data,
		horizontal: true,
		label: self.rig_name,
		font: self.font,
		on_color: self.mc_data["MASTER"][0].slider.color2,
		off_color: self.mc_data["MASTER"][0].slider.color1,
		labelcolor: self.mc_data["MASTER"][0].slider.color1,
		bg_color: self.mc_data["MASTER"][0].slider.color2
	}
	
	//update checkbox node
	update_mcNode(self.mc_data["CHECKBOX"].node, options);
	node.showControls(self.mc_data["CHECKBOX"].node, true);
	
	//conecta o  mc node ao static
	node.link(self.mc_data["CHECKBOX"].peg, 0, self.mc_data["CHECKBOX"].node, 0, false, false);
	Print("End action checkbox");
	
	mainTab.labelStatusCB.text = "Check box updated!";

	scene.endUndoRedoAccum();
}
exports.updateCheckBoxMC = updateCheckBoxMC;


/*
	lsita todos arquivos tbState usados no mc node
*/
function listtbStates(mcnode){
	var uiDataAttr = node.getTextAttr(mcnode,1,"uiData");
	var regex = /\/scripts\/.+\.tbState/g;
	var matches = uiDataAttr.match(regex);
	return matches.map(function(item){ return scene.currentProjectPath() + item});
}
exports.listtbStates = listtbStates;
