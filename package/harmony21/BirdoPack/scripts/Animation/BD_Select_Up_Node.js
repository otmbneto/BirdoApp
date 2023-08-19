/*NAO CONTEM ICONE! PARA USO SOMENTE COMO SHORTCUT
-------------------------------------------------------------------------------
Name:		BD_Select_Up_Node.js

Description:	Este script serve para selecionar o proximo node na hierarquia ignorando grupos, efeitos e mostra o deform quando disponivel

Usage:		Serve como substituto do orignial Select Parent Node Skipping Effects do toon boom.

Author:		Leonardo Bazilio Bentolila

Created:	janeiro, 2022
            
Copyright:   leobazao_@Birdo (adaptado da ideia do script do Stoliar);
 
-------------------------------------------------------------------------------
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function BD_Select_Up_Node(){
	
	//INITIAL VARS
	var nodeSelected = selection.selectedNode(0);
	var nextNode = node.srcNode(nodeSelected,0);

	//hide deformers
	Action.perform("onActionHideDeformer(QString)","miniPegModuleResponder", nodeSelected);

	if(nodeSelected == ""){
		Print("[BD_SELECTUPNODE] No NODE selections found!");
		return;
	}

	if(nextNode == ""){
		Print("[BD_SELECTUPNODE] End of navigation!!");
		return;
	}
	
	if(node.type(nextNode) == "MULTIPORT_IN"){//pula grupos
		var jump = node.parentNode(nextNode);
		selection.clearSelection();
		selection.addNodeToSelection(jump);
		Action.perform("onActionNaviSelectParent()");
	}else{
		if(node.type(nodeSelected) == "READ"){
			Action.perform("onActionShowSelectedDeformers()","miniPegModuleResponder");
		}
		Action.perform("onActionNaviSelectParent()");
	}
	
	//EXTRA FUNCTIONS
	function is_deform_group(nodePath){//cheks if node is deform group
		if(!node.isGroup(nodePath)){
			return false;
		}
		var defTypesList = ["DeformationRootModule","DeformationScaleModule","DeformationSwitchModule","REFRACT","DeformationCompositeModule","WeightedDeform","AutoFoldModule","AutoMuscleModule","FreeFormDeformation","Turbulence","GameBoneModule","BoneModule","BendyBoneModule","CurveModule","GLUE","ArticulationModule","BezierMesh","OffsetModule","DeformTransformOut","KinematicOutputModule","FoldModule","DeformationWaveModule","DeformationUniformScaleModule"];
		var defNodesList = node.subNodes(nodePath).filter(function(x){
			var nodeType = node.type(x);
			return defTypesList.indexOf(nodeType) != -1;
		});
		return defNodesList.length > 0;	
	}	
}