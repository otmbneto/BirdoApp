include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		add_gradient_utils.js

Description:	utils do add gradient ao rig da comp

Usage:		usado na comp para adicionar um gradient de efeito com cutter no rig (utils de funcoes)

Author:		Leonardo Bazilio Bentolila

Created:	agosto, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/


//cria objeto com info de posicao (rect) para cada frame
function getTimelineRectPosition(read_list, draw_util, useProgressBar){

	var timeline_data = {
		is_valid: false,
		rect_list: []	
	}

	//frame 1 rect 
	var rect1 = getRigCordinatesSelection(read_list, 1, draw_util);

	if(Boolean(rect1)){
		timeline_data["is_valid"] = true;
		timeline_data["rect_list"].push(rect1);		
	}
	
	//progress bar
	if(useProgressBar){
		var progressDlg = new QProgressDialog();
		progressDlg.setStyleSheet(progressDlg_style);
		progressDlg.modal = true;
		progressDlg.open();
		progressDlg.setRange(2, frame.numberOf());
	}
	
	//loop in frames
	for(var i=2; i<=frame.numberOf(); i++){
		if(useProgressBar){
			progressDlg.setValue(i);			
			progressDlg.setLabelText("Analizando frame : " + i);
			if(progressDlg.wasCanceled){
				MessageBox.information("Cancelado!");
				Print("canceled!");
				return false;
			}
		}

		var rect = getRigCordinatesSelection(read_list, i, draw_util);
		if(!rect){
			continue;
		} else {
			timeline_data["is_valid"] = true;	
		}
		var lastRect = timeline_data.rect_list[timeline_data.rect_list.length-1];
		if(Boolean(lastRect) && !rect.isEqual(lastRect)){
			timeline_data["rect_list"].push(rect);		
		}
	}
	if(useProgressBar){
		progressDlg.close();
	}
	return timeline_data;
}
exports.getTimelineRectPosition = getTimelineRectPosition;


//add fx grad patch group to rig selection return object with nodes data from patch
function add_gradient_patch(node_selected, proj_data){
	
	//patch data
	var patch = {
		is_rig: null,
		rig_node: node_selected,
		full_node: null,
		patch_node: null,
		gradient_node: null,
		read_list: []
	}
	var add_patch = null;
	//test node type and add patch acording
	if(node.type(node_selected) == "READ"){
		//add patch node 
		add_patch = addFxGroup(patch["rig_node"]);
		Print("Selecion is READ node!");
	} else if(node.isGroup(node_selected)){
		patch["is_rig"] = true;
		Print("Selection is group node RIG");
		//test is is full rig
		var is_full = proj_data.pattern.asset.test(node.getName(node_selected));
		
		if(!is_full){
			var multiOut = node.getGroupOutputModule(node_selected, "Multi-Port-Out", 0, 0, 0);
			var connections = node.numberOfInputPorts(multiOut);
			var rig_regex = proj_data.get_rig_regex();

			var filter_full = node.subNodes(node_selected).filter(function(item){ return rig_regex.test(node.getName(item));});
			if(filter_full.length == 0){
				Print("Can't find full node!");
				return false;
			}
			patch["full_node"] = filter_full[0];

			//add patch node 
			add_patch = addFxGroup(patch["full_node"]);
			node.link(add_patch[0], 0, multiOut, connections, true, true);
		} else {
			add_patch = addFxGroup(patch["rig_node"]);
		}
	} else {
		Print("Invalid node type selection!");
		return false;
	}
	
	//update patch object values
	if(!add_patch){
		Print("Something went wrong!");
		return false;
	}
	patch["patch_node"] = add_patch[0];
	patch["gradient_node"] = add_patch[1];
	if(patch["is_rig"]){
		patch["read_list"] = patch["full_node"] ? BD2_ListNodesInGroup(patch["full_node"], ["READ"], true) : BD2_ListNodesInGroup(patch["rig_node"], ["READ"], true);
	} else {
		patch["read_list"] = [patch.rig_node];
	}
	return patch;
}
exports.add_gradient_patch = add_gradient_patch;

//create patch fx with gradient and cutter return [0] = patch group [1] = grad node
function addFxGroup(selectedNode){
	//add nodes
	var fx_group = node.add(node.parentNode(selectedNode), "FX_Grad","GROUP", 0, 0, 1);
	var multiIn = node.getGroupInputModule(fx_group, "Multi-Port-In", 0, -124, 1);
	var multiOut = node.getGroupOutputModule(fx_group, "Multi-Port-Out", 0, 156, 1);
	var grad = node.add(fx_group, "Grad", "GRADIENT-PLUGIN", 73, -48, 1);	
	var cutter = node.add(fx_group, "Cutter", "CUTTER", 18, 48, 2);

	//link sub nodes
	node.link(grad, 0, cutter, 0);
	node.link(multiIn, 0, cutter, 1, true, false);
	node.link(multiIn, 1, grad, 0, true, false);
	node.link(cutter, 0, multiOut, 0, false, true);
	
	//invert cutter
	node.setTextAttr(cutter, "INVERTED", 1, true);
	
	//set basic attributes to grad node
	node.setTextAttr(grad, "Color0.RED", 1, 0);
	node.setTextAttr(grad, "Color0.GREEN", 1, 0);
	node.setTextAttr(grad, "Color0.BLUE", 1, 0);
	//add column to points attributes
	var col_x0 = column.generateAnonymousName();
	column.add(col_x0, "BEZIER");
	node.linkAttr(grad, "0.X", col_x0);
	
	var col_y0 = column.generateAnonymousName();
	column.add(col_y0, "BEZIER");
	node.linkAttr(grad, "0.Y", col_y0);

	var col_x1 = column.generateAnonymousName();
	column.add(col_x1, "BEZIER");
	node.linkAttr(grad, "1.X", col_x1);
	
	var col_y1 = column.generateAnonymousName();
	column.add(col_y1, "BEZIER");
	node.linkAttr(grad, "1.Y", col_y1);
	
	//connect fx group
	BD2_ConnectNodeUnder(selectedNode, fx_group, false);
	
	return [fx_group, grad];
}
exports.addFxGroup = addFxGroup;

//aplica informacao de transformacao em todos frames da timeline_data
function applyTransformToGradPoints(transform_data, grad_node){
	
	transform_data.rect_list.forEach(function(item){
		applyValuesToGradientAtFrame(item, item.frame, grad_node);
	});
	Print("Applyed tranformation to : " + transform_data.rect_list.length + " frames in the gradiente node!");
}
exports.applyTransformToGradPoints = applyTransformToGradPoints;



//aplicao os valores do rect de selecao ao node gradient no FRAME
function applyValuesToGradientAtFrame(rect, frame, grad){
	var column0X = node.linkedColumn(grad, "0.X");
	column.setKeyFrame(column0X, frame);
	var column0Y = node.linkedColumn(grad, "0.Y");
	column.setKeyFrame(column0Y, frame);	

	var column1X = node.linkedColumn(grad, "1.X");
	column.setKeyFrame(column1X, frame);
	
	var column1Y = node.linkedColumn(grad, "1.Y");
	column.setKeyFrame(column1Y, frame);	

	column.setEntry(column0X, 1, frame, rect.center().x);
	column.setEntry(column1X, 1, frame, rect.center().x);

	column.setEntry(column0Y, 1, frame, rect.top());
	column.setEntry(column1Y, 1, frame, rect.bottom());

}

//retorna rect de selecao do todos nodes do rig (ou node read) selecionado no frame
function getRigCordinatesSelection(read_list, atframe, draw_util){

	var rect = null;
	read_list.forEach(function(item, index){
		var node_rect = generateDrawingRectPosition(item, atframe, draw_util);
		if(!node_rect){
			Print("No rect for node : " + item + " at frame: "+ atframe);
			return;
		}
		if(!rect){
			rect = node_rect; 
			return;
		}
		if(node_rect){
			rect.unite(node_rect);
		}
	});
	if(!rect){
		return false;
	}
	rect["frame"] = atframe;
	return rect;
}

//return camera box rect
function getCameraRectPosition(atframe, draw_util){
	
	var cam_matrix = scene.getCameraMatrix(atframe);
	var cam_box =  {
		"x0": -3333,
		"x1": 3333,
		"y0": -1875,
		"y1": 1875
	}
	var dRect = new draw_util.RectObject(cam_box);
	dRect.toFields();
	dRect.multiplyMatrix(cam_matrix);
	return dRect;
	
}	
exports.getCameraRectPosition = getCameraRectPosition;

//cria rect do node individual no frame
function generateDrawingRectPosition(node_path, atframe, draw_util){
	
	var node_matrix = node.getMatrix(node_path, atframe);
	//var def_matrix_list = getDeformationMatrixList(node_path, atframe);
	var box = getNodeBox(node_path, atframe);
	if(!box){
		//Print("No drawing box found in node: " + node_path);
		return false;
	}
	var dRect = new draw_util.RectObject(box);
	dRect.toFields();

	/*/apply deformation matrix to drawing
	if(def_matrix_list){
		dRect.applyDeformation(def_matrix_list);
	}*/
	
	dRect.multiplyMatrix(node_matrix);

	return dRect;
}
exports.generateDrawingRectPosition = generateDrawingRectPosition;

function getNodeBox(node_path, atframe){
	var currentDrawing = Drawing.Key({node : node_path, frame : atframe});
	var config = {
		drawing  : currentDrawing
	};
	var data = Drawing.query.getData(config); 
	var box = data.box;

	if(!box || box.hasOwnProperty("empty")){
		return false;
	}
	var is_empty = Object.keys(box).every(function(item){ return box[item] == 0});
	return is_empty ? false : box;
}
exports.getNodeBox = getNodeBox;

//retorna lista de matrices do deform do drawing (false se nao tiver deform);
function getDeformationMatrixList(readNode, atFrame){
	var upnode = node.srcNode(readNode, 0);
	if(node.isGroup(upnode) && /^(Def)/.test(node.getName(upnode))){
		var matrices_list = new Array();
		var multiport = node.getGroupOutputModule(upnode, "Multi-Port-Out", 0, 0, 0);
		upnode = node.srcNode(multiport, 0);
		while(node.type(upnode) == "CurveModule" || node.type(upnode) == "OffsetModule"){
			var def_matrix = deformation.nextDeformMatrix(upnode, atFrame);
			matrices_list.push(def_matrix);
			upnode = node.srcNode(upnode, 0);
		}
		return matrices_list;
	}
	return false;		
}