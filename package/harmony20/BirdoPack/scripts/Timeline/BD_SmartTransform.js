/*
-------------------------------------------------------------------------------
Name:		BD_SmartTransform.js

Description:	Este Script muda posição do eixo escolhido em um trecho escolhido, ou da timeline inteira;

Usage:		Selecione um eixo e a parte da timeline para aplicar o valor em todos os keys já existentes;

Author:		Leonardo Bazilio Bentolila

Created:	setembro, 2019. _______update Corona (Marco, 2020);
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_SmartTransform(){

	var module = selection.selectedNode(0);
	var frames = frame.numberOf();

	if(module == ""){
		MessageBox.information("Nenhum node selecionado!");
		return;
	}

	if(selection.numberOfNodesSelected() > 1){
		MessageBox.information("Selecione apenas um Node!!"); 
		return;
	}

	if(node.type(module) != "PEG"){
		MessageBox.information("Isto Não é um node possível!\nSelecione uma Peg ou Drawing!!"); 
		return;
	}

	if(node.getTextAttr(module,1,"POSITION.SEPARATE")== "Off"){
		MessageBox.information("Esta Peg é 3dPath! Este Script só funciona em pegs Separetes!\nFoi mal ae!"); 
		return;
	}

	var projectDATA = BD2_ProjectInfo();

	if(!projectDATA){
		Print("[ERROR] Fail to get BirdoProject paths and data... canceling!");
		return false;
	}
	
	var pathUI = projectDATA.paths.birdoPackage + "ui/BD_SmartTransform.ui";

	var d = new defineInterface(pathUI, module);
	d.ui.show();


}

function defineInterface(pathUI, nod){

	var firstFrame = Timeline.firstFrameSel;
	var endFrame = firstFrame + Timeline.numFrameSel - 1;

	if(!selection.isSelectionRange()){
		endFrame = firstFrame + 1;
	}


	this.ui = UiLoader.load(pathUI);
	
	this.ui.setMaximumSize(355, 374);//fix windows size
	this.ui.activateWindow();

	this.ui.group3.spinBox_Start.setRange(1, (frame.numberOf() - 1));
	this.ui.group3.spinBox_End.setRange(2, frame.numberOf());

	this.ui.group3.spinBox_Start.setValue(firstFrame);
	this.ui.group3.spinBox_End.setValue(endFrame);

	this.checkPosX = function(){
		if(this.ui.group1.checkX.checked){
			this.ui.group1.spinBox_X.enabled = true;
		} else { 
			this.ui.group1.spinBox_X.enabled = false;
		}
		}
		this.checkPosY = function(){
		if(this.ui.group1.checkY.checked){
		this.ui.group1.spinBox_Y.enabled = true;
		} else { this.ui.group1.spinBox_Y.enabled = false;
		}
		}
		this.checkPosZ = function(){
		if(this.ui.group1.checkZ.checked){
		this.ui.group1.spinBox_Z.enabled = true;
		} else { this.ui.group1.spinBox_Z.enabled = false;
		}
		}
		this.checkScaX = function(){
		if(this.ui.group2.checkSx.checked){
		this.ui.group2.spinBox_Sx.enabled = true;
		}else { this.ui.group2.spinBox_Sx.enabled = false;
		}
		}
		this.checkScaY = function(){
		if(this.ui.group2.checkSy.checked){
		this.ui.group2.spinBox_Sy.enabled = true;
		} else { this.ui.group2.spinBox_Sy.enabled = false;
		}
		}
		this.checkAllTimeline = function(){
		this.ui.group3.enabled = false;
		}
		this.checkSelection = function(){
		this.ui.group3.enabled = true;
		}
		this.checkAll = function(){ 
		if(this.ui.checkALL.checked){
		this.ui.group1.checkX.setChecked(true);
		this.ui.group1.checkY.setChecked(true);
		this.ui.group1.checkZ.setChecked(true);
		this.ui.group2.checkSx.setChecked(true);
		this.ui.group2.checkSy.setChecked(true);
		}
		}
		this.checkAdd = function(){
		var text;
		if(this.ui.checkAdd.checked){
		text = "ADD";
		} else {
		text = "";
		}
			if(this.ui.group1.checkX.checked){
			this.ui.group1.labelX.setText(text);
			}
			if(this.ui.group1.checkY.checked){
			this.ui.group1.labelY.setText(text);
			}
			if(this.ui.group1.checkZ.checked){
			this.ui.group1.labelZ.setText(text);
			}
			if(this.ui.group2.checkSx.checked){
			this.ui.group2.labelSX.setText(text);
			}
			if(this.ui.group2.checkSy.checked){
			this.ui.group2.labelSY.setText(text);
			}
		}
		this.getCurrentVal = function(){
		var n = selection.selectedNode(0);
		if(this.ui.group1.checkX.checked){
		var xCV = node.getTextAttr(n,frame.current(),"POSITION.X");
		this.ui.group1.spinBox_X.setValue(xCV);
		}
		if(this.ui.group1.checkY.checked){
		var yCV = node.getTextAttr(n,frame.current(),"POSITION.Y");
		this.ui.group1.spinBox_Y.setValue(yCV);
		}
		if(this.ui.group1.checkZ.checked){
		var zCV = node.getTextAttr(n,frame.current(),"POSITION.Z");
		this.ui.group1.spinBox_Z.setValue(zCV);
		}
		if(this.ui.group2.checkSx.checked){
		var sxCV = node.getTextAttr(n,frame.current(),"SCALE.X");
		this.ui.group2.spinBox_Sx.setValue(sxCV);
		}
		if(this.ui.group2.checkSy.checked){
		var syCV = node.getTextAttr(n,frame.current(),"SCALE.Y");
		this.ui.group2.spinBox_Sy.setValue(syCV);
		}
		}
		
		this.okOperation = function(){
		scene.beginUndoRedoAccum("Smart Position");
	if(this.ui.radioB_AllTime.checked){
		firstFrame = 1;
		endFrame =  frame.numberOf();
		} else {
		firstFrame = this.ui.group3.spinBox_Start.value;
		endFrame = this.ui.group3.spinBox_End.value;
	}
	if(this.ui.group1.checkX.checked){
	var valor = this.ui.group1.spinBox_X.value;
		if(this.ui.checkAdd.checked){
			addTransform(nod, "POSITION.X", valor, firstFrame, endFrame);
			} else {
			changeTransform(nod, "POSITION.X", valor, firstFrame, endFrame);
		}
	}
	if(this.ui.group1.checkY.checked){
	var valor = this.ui.group1.spinBox_Y.value;
		if(this.ui.checkAdd.checked){
			addTransform(nod, "POSITION.Y", valor, firstFrame, endFrame);
			} else {
			changeTransform(nod, "POSITION.Y", valor, firstFrame, endFrame);
			}
		}
	if(this.ui.group1.checkZ.checked){
	var valor = this.ui.group1.spinBox_Z.value;
		if(this.ui.checkAdd.checked){
			addTransform(nod, "POSITION.Z", valor, firstFrame, endFrame);
			} else {
			changeTransform(nod, "POSITION.Z", valor, firstFrame, endFrame);
			}
		}
	if(this.ui.group2.checkSx.checked){
	var valor = this.ui.group2.spinBox_Sx.value;
		if(this.ui.checkAdd.checked){
			addTransform(nod, "SCALE.X", valor, firstFrame, endFrame);
			} else {
			changeTransform(nod, "SCALE.X", valor, firstFrame, endFrame);
			}
		}
	if(this.ui.group2.checkSy.checked){
	var valor = this.ui.group2.spinBox_Sy.value;
		if(this.ui.checkAdd.checked){
			addTransform(nod, "SCALE.Y", valor, firstFrame, endFrame);
			} else {
			changeTransform(nod, "SCALE.Y", valor, firstFrame, endFrame);
			}
		}
		scene.endUndoRedoAccum();
		this.ui.close();
		}
			
		this.cancelOperation = function(){
		this.ui.close();
		}
		
		this.ui.group1.checkX.toggled.connect(this,this.checkPosX);
		this.ui.group1.checkY.toggled.connect(this,this.checkPosY);
		this.ui.group1.checkZ.toggled.connect(this,this.checkPosZ);
		this.ui.group2.checkSx.toggled.connect(this,this.checkScaX);
		this.ui.group2.checkSy.toggled.connect(this,this.checkScaY);
		this.ui.radioB_AllTime.toggled.connect(this,this.checkAllTimeline);
		this.ui.radioB_Selection.toggled.connect(this,this.checkSelection);
		this.ui.checkALL.toggled.connect(this,this.checkAll);
		this.ui.checkAdd.toggled.connect(this,this.checkAdd);	

		this.ui.cancelButton.clicked.connect(this,this.cancelOperation);
		this.ui.currVal.clicked.connect(this,this.getCurrentVal);
		this.ui.okButton.clicked.connect(this,this.okOperation);
		
		
	//funcao que muda os valores dos atributos escolhidos na selecao da TL escolhida//
	function changeTransform(nodeSel, att, val, start, end){
		for(i = start; i<=end; i++){
			var coluna = node.linkedColumn(nodeSel, att);
			var isKeyX = column.isKeyFrame(coluna,1,i);
			if(isKeyX==true){		
				node.setTextAttr(nodeSel, att,i, val);
			}
		}	
	}
	//funcao que adiciona um dado valor, ao atributo escolhido na selecao da TL escolhida//
	function addTransform(nodeSel, att, val, start, end){
		
		for(i = start; i<=end; i++){
			var coluna = node.linkedColumn(nodeSel, att);
			var isKeyX = column.isKeyFrame(coluna,1,i);

			if(isKeyX==true){		
				var currVal = node.getTextAttr(nodeSel,i,att);
				var newVal = parseFloat(currVal) + val;
				node.setTextAttr(nodeSel, att,i, newVal);
			}
		}
	}

}