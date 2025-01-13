/*
-------------------------------------------------------------------------------
Name:		BD_setPassTrough.js

Description:	Este script muda as composites selecionadas para PassTorugh;

Usage:		Deve ser usado na Node View;

Author:		Desconhecido

Created:	maginpanic - update birdoApp janeiro 2022;
            
Copyright:   maginpanic
 
-------------------------------------------------------------------------------
*/

function BD_setPassTrough(){

	if(selection.selectedNode(0) == ""){
		MessageBox.information("Selecione pelo menos uma composite!!!");
		return;
	}

	scene.beginUndoRedoAccum("Set modules active layers");
	d = new Dialog;
	d.title = "Mode_properties";

	var group = new GroupBox;

	var RB1_bitmap = new RadioButton;
	var RB2_seamless = new RadioButton;
	var RB3_vect = new RadioButton;
	var RB4_pass = new RadioButton;

	var RBchecked = "compositePassthrough";

	RB1_bitmap.checked = false;
	RB2_seamless.checked = false;
	RB3_vect.checked = false;
	RB4_pass.checked = true;

	RB1_bitmap.text = "As Bitmap";
	RB2_seamless.text = "As Seamless Bitmap";
	RB3_vect.text = "As Vector";
	RB4_pass.text = "Pass Through";

	if(KeyModifiers.IsShiftPressed()){
		group.add(RB1_bitmap);
		group.add(RB2_seamless);
		group.add(RB3_vect);
		group.add(RB4_pass);
		d.add(group);
		d.addSpace(1);

		var rc = d.exec();

		if(!rc){// Call dialog, pressing "Cancel" returns false
			return;
		}

		if(RB1_bitmap.checked){
			RBchecked = "compositeBitmap";
		}
		if(RB2_seamless.checked){
			RBchecked = "compositeVectorToBitmap";
		}
		if(RB3_vect.checked){
			RBchecked = "compositeVector";
		}
		if(RB4_pass.checked){
			RBchecked = "compositePassthrough";
		}

		for(var sel_index = 0 ; sel_index < selection.numberOfNodesSelected(); sel_index++){
			var node_name = selection.selectedNode( sel_index );
			node.setTextAttr( node_name, "compositeMode", 1, RBchecked );
		}
	} else {
		for(var sel_index = 0 ; sel_index < selection.numberOfNodesSelected(); sel_index++){
			var node_name = selection.selectedNode( sel_index );
			node.setTextAttr( node_name, "compositeMode", 1, "compositePassthrough" );
		}
	}
	scene.endUndoRedoAccum();
}

