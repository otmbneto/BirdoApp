include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		drawing_api.js

Description:	este script reune funcoes para lidar com drawings no toon boom

Usage:		funcoes para manipular drawings no harmony

Author:		Leonardo Bazilio Bentolila

Created:	agosto, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

//convert a box object to coordinates object with especifc methods (use this instead of QRect)
function RectObject(box){
	
	//points values
	this.x0 = box.x0;
	this.y0 = box.y0;
	this.x1 = box.x1;
	this.y1 = box.y1;
	
	//factor to convert from drawing coordinate, to filds coordinate
	this.factor_convert = new Point2d(208.3, 156.25);
	
	//convert flag
	this.current_state = 'drawing';//possibles are 'drawing' and 'fields'
	this.ogl = false;
	
	//Methods
	this.toDrawing = function(){//convert points do drawing coordinate
		if(this.current_state == 'drawing'){
			MessageLog.trace("Current state is already 'drawing'!");
			return;
		}
		this.x0 = this.x0 * this.factor_convert.x;
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
	
	this.toOGL = function(){
		//if(this.current_state != 'fields'){
		//	MessageLog.trace("State must be 'fields' to convert to OGL!");
		//	return;
		//}
		if(this.ogl){
			MessageLog.trace("already is OGL!");
			return;
		}
		this.x0 = scene.toOGLX(this.x0);
		this.x1 = scene.toOGLX(this.x1);
		this.y0 = scene.toOGLY(this.y0);
		this.y1 = scene.toOGLY(this.y1);
		this.ogl = true;	
	}

	this.fromOGL = function(){
		//if(this.current_state != 'fields'){
		//	MessageLog.trace("State must be 'fields' to convert to OGL!");
		//	return;
		//}
		if(!this.ogl){
			MessageLog.trace("already is not OGL!");
			return;
		}
		this.x0 = scene.fromOGLX(this.x0);
		this.x1 = scene.fromOGLX(this.x1);
		this.y0 = scene.fromOGLY(this.y0);
		this.y1 = scene.fromOGLY(this.y1);
		this.ogl = false;	
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
	
	this.topLeftCorner = function(){
		return new Point3d(this.x0, this.y1, 0);
	}

	this.topRigthCorner = function(){
		return new Point3d(this.x1, this.y1, 0);
	}

	this.bottomLeftCorner = function(){
		return new Point3d(this.x0, this.y0, 0);
	}

	this.bottomRigthCorner = function(){
		return new Point3d(this.x1, this.y0, 0);
	}

	this.translate = function(x, y){//unused (but works)
		this.x0 += x;
		this.x1 += x;
		this.y0 += y;
		this.y1 += y;
	}
	
	this.scale = function(x, y, pivot){//UNUSED
		var new_w = this.width() * x;
		var new_h = this.height() * y;
		var x0Distance = ((pivot.x - this.x0)/this.width());
		var x1Distance = ((this.x1 - pivot.x)/this.width());
		var y0Distance = ((pivot.y - this.y0)/this.height());
		var y1Distance = ((this.y1 - pivot.y)/this.height());
		Print("x0 : " + x0Distance + " x1 : " + x1Distance + " y0 : " + y0Distance + " y1  : " + y1Distance);
		this.x0 = this.x0 - ((new_w - this.width())*x0Distance);
		this.x1 = this.x1 + ((new_w - this.width())*x1Distance);
		this.y0 = this.y0 - ((new_h - this.height())*y0Distance);
		this.y1 = this.y1 + ((new_h - this.height())*y1Distance);
	}
	
	this.changeState = function(stateName){//change current state to state name
		if(stateName == "fields"){
			this.toFields();
		} else if(stateName == "drawing"){
			this.toDrawing();	
		}
	}	
	
	this.isEqual = function(rect2){//compare two rect objects
		if(this.current_state != rect2.current_state){
			rect2.changeState(this.current_state);	
		}
		if(this.ogl != rect2.ogl){
			if(this.ogl){
				rect2.toOGL();
			} else {
				rect2.fromOGL();	
			}
		}
		return this.x0 == rect2.x0 && this.x1 == rect2.x1 && this.y0 == rect2.y0 && this.y1 == rect2.y1;		
	}
	
	this.intersectsPoint = function(p3d){
		return (p3d.x >= this.x0 &&  p3d.x <= this.x1) && (p3d.y >= this.y0 &&  p3d.y <= this.y1);	
	}
	
	this.intersects = function(rect2){
		var check1 = this.intersectsPoint(rect2.topLeftCorner());	
		var check2 = this.intersectsPoint(rect2.topRigthCorner());
		var check3 = this.intersectsPoint(rect2.bottomLeftCorner());
		var check4 = this.intersectsPoint(rect2.bottomRigthCorner());
		return check1 || check2 || check3 || check4;
	}
	
	this.unite = function(rect2){
		this.x0 = (this.x0 > rect2.x0) ? rect2.x0 : this.x0;
		this.x1 = (this.x1 < rect2.x1) ? rect2.x1 : this.x1;		
		this.y0 = (this.y0 > rect2.y0) ? rect2.y0 : this.y0;
		this.y1 = (this.y1 < rect2.y1) ? rect2.y1 : this.y1;
	}
	//aplica a deformacao do deform no box do drawing (ignora curvas e retorna a posicao dos pontos de deform)
	this.applyDeformation = function(def_matrix_list){
		//change to ogl
		this.toOGL();
		var deformation_points = [];
		def_matrix_list.forEach(function(item){
			deformation_points.push(item.extractPosition());	
		});
		//rect corners points
		var rect_points = [this.topLeftCorner(), this.topRigthCorner(), this.bottomLeftCorner(), this.bottomRigthCorner()];
		//merged points arrays
		var points_list = rect_points.concat(deformation_points);
		
		//x values array
		var arrayX = points_list.map(function(item){ return item.x;});
		//y values array
		var arrayY = points_list.map(function(item){ return item.y;});
		arrayX.sort(function(a, b){ return a-b});
		arrayY.sort(function(a, b){ return a-b});
		//set values
		this.x0 = arrayX[0];
		this.x1 = arrayX[arrayX.length-1];
		this.y0 = arrayY[0];
		this.y1 = arrayY[arrayY.length-1];
		//change back to NOT ogl
		this.fromOGL();
	}
		
	this.multiplyMatrix = function(matrix){//multiply matrix and give rect new outside box
		//change to ogl
		this.toOGL();
		//multiply matrix to get points values
		var top0 = matrix.multiply(this.topLeftCorner());
		var top1 = matrix.multiply(this.topRigthCorner());
		var bottom0 = matrix.multiply(this.bottomLeftCorner());
		var bottom1 = matrix.multiply(this.bottomRigthCorner());
		//create array of values to sort each value
		var arrayX = [top0.x, top1.x, bottom0.x, bottom1.x];
		arrayX.sort(function(a, b){ return a-b});
		var arrayY = [top0.y, top1.y, bottom0.y, bottom1.y];
		arrayY.sort(function(a, b){ return a-b});
		//set values
		this.x0 = arrayX[0];
		this.x1 = arrayX[arrayX.length-1];
		this.y0 = arrayY[0];
		this.y1 = arrayY[arrayY.length-1];
		//change back to NOT ogl
		this.fromOGL();
	}
}
exports.RectObject = RectObject;