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
	
//add gradient fx
function add_gradiente(selected_node, projData){
	
	var drawing_util_script = projData.paths.birdoPackage + "utils/drawing_api.js";
	var drawing_util = require(drawing_util_script);
	
	
	
	
}

//create patch fx with gradient and cutter
function addPatchFX(selectedNode){
	//add nodes
	var fx_group = node.add(node.root(), "FX_Grad","GROUP", 0, 0, 1);
	var multiIn = node.getGroupInputModule(fx_group, "Multi-Port-In", 0, -124, 1);
	var multiOut = node.getGroupOutputModule(fx_group, "Multi-Port-Out", 0, 156, 1);
	var grad = node.add(fx_group, "Grad", "GRADIENT-PLUGIN", -53, -24, 1);	
	var cutter = node.add(fx_group, "Cutter", "CUTTER", 18, 48, 2);

	//link sub nodes
	node.link(grad, 0, cutter, 1);
	node.link(multiIn, 0, cutter, 0, true, false);
	node.link(multiIn, 1, grad, 0, true, false);
	node.link(cutter, 0, multiOut, 0, false, true);
	
	//connect fx group
	BD2_ConnectNodeUnder(selectedNode, fx_group);
	
	return grad;
}

	
	
//aplicao os valores do rect de selecao ao node gradient
function applyValuesToGradient(rect, grad){
	var att0X = node.getAttr(grad, frame.current(), "0.X");
	var att0Y = node.getAttr(grad, frame.current(), "0.Y");

	var att1X = node.getAttr(grad, frame.current(), "1.X");
	var att1Y = node.getAttr(grad, frame.current(), "1.Y");

	att0X.setValue(rect.center().x);
	att1X.setValue(rect.center().x);
	
	att0Y.setValue(rect.top());
	att1Y.setValue(rect.bottom());
}

//retorna rect de selecao do todos nodes do rig (ou node read) selecionado no frame
function getRigCordinatesSelection(node_path, atframe){

	if(node.type(node_path) == "READ"){
		var read_list = [node_path];
	} else if(node.isGroup(node_path)){
		var read_list = BD2_ListNodesInGroup(node_path, ["READ"], true);
	} else {
		Print("Invalid node type!");
		return false;
	}
	var rect = null;
	read_list.forEach(function(item){
		var node_rect = generateDrawingRectPosition(item, atframe);
		if(!rect){
			rect = node_rect; 
			return;
		}
		if(node_rect){
			rect.unite(node_rect);
		}
	});
	return rect;
}

//cria rect do node individual no frame
function generateDrawingRectPosition(node_path, atframe){
	var node_m = node.getMatrix(node_path, atframe);
	var box = getNodeBox(node_path, atframe);
	if(!box){
		Print("No drawing box found in node: " + node_path);
		return false;
	}
	var dRect = new RectObject(box);
	dRect.toFields();

	var n_origin = new Point3d(scene.fromOGLX(node_m.origin().x), scene.fromOGLY(node_m.origin().y), scene.fromOGLY(node_m.origin().z));
	var scale = node_m.extractScale(node_m.origin(), false);
	
	dRect.translate(n_origin.x, n_origin.y);
	dRect.scale(scale.x, scale.y, n_origin);
	return dRect;
}

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
	return box;
}



function RectObject(box){
	
	//points values
	this.x0 = box.x0;
	this.y0 = box.y0;
	this.x1 = box.x1;
	this.y1 = box.y1;
	
	//factor to convert from drawing coordinate, to filds coordinate
	this.factor_convert = new Point2d(208.3, 156.25);
	
	//convert flag
	this.current_state = 'drawing';//possibles as 'drawing' and 'fields'
	
	
	//Methods
	this.toDrawing = function(){//convert points do drawing coordinate
		if(this.current_state == 'drawing'){
			MessageLog.trace("Current state is already 'drawing'!");
			return;
		}
		this.x0 = this.x0 *this.factor_convert.x;
		this.x1 = this.x1 * this.factor_convert.x;
		this.y0 = this.y0 * this.factor_convert.y;
		this.y1 = this.y1 * this.factor_convert.y;
		this.current_state = 'drawing';
	}
	
	this.toFields = function(){//convert points do fields coordinate
		if(this.current_state == 'fields'){
			MessageLog.trace("Current state is already 'fields'!");
			return;
		}
		this.x0 = this.x0/this.factor_convert.x;
		this.x1 = this.x1/this.factor_convert.x;
		this.y0 = this.y0/this.factor_convert.y;
		this.y1 = this.y1/this.factor_convert.y;
		this.current_state = 'fields';
	}
	
	this.width = function(){
		return this.x1 - this.x0;
	}
	
	this.height = function(){
		return this.y1 - this.y0;
	}
	
	this.center = function(){
		return new Point2d(this.x0 + (this.width()/2), this.y1 - (this.height()/2));
	}

	this.left = function(){
		return this.x0;
	}

	this.rigth = function(){
		return this.x1;
	}
	
	this.top = function(){
		return this.y1;
	}
	
	this.bottom = function(){
		return this.y0;
	}
	
	this.translate = function(x, y){
		this.x0 += x;
		this.x1 += x;
		this.y0 += y;
		this.y1 += y;
	}
	
	this.scale = function(x, y, pivot){
		var new_w = this.width() * x;
		var new_h = this.height() * y;
		var x0Distance = ((pivot.x - this.x0)/this.width());
		var x1Distance = ((this.x1 - pivot.x)/this.width());
		var y0Distance = ((pivot.y - this.y0)/this.height());
		var y1Distance = ((this.y1 - pivot.y)/this.height());
		this.x0 = this.x0 - ((new_w - this.width())*x0Distance);
		this.x1 = this.x1 + ((new_w - this.width())*x1Distance);
		this.y0 = this.y0 - ((new_h - this.height())*y0Distance);
		this.y1 = this.y1 + ((new_h - this.height())*y1Distance);
	}
	
	this.unite = function(rect2){
		this.x0 = (this.x0 > rect2.x0) ? rect2.x0 : this.x0;
		this.x1 = (this.x1 < rect2.x1) ? rect2.x1 : this.x1;		
		this.y0 = (this.y0 > rect2.y0) ? rect2.y0 : this.y0;
		this.y1 = (this.y1 < rect2.y1) ? rect2.y1 : this.y1;
	}
}


exports.RectObject = RectObject;