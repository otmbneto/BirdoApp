/*
	este script lista funcoes para lidar com a nodeview no harmony
	como organizar e conectar waypoints
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


//copia as informacoes de backdrop, nodecoord e waypoints de um grupo para o outro
function copyGroupsNodeviewCoords(group1, group2){
	//update coords
	var subs1 = node.subNodes(group1);
	var n_counter = 0;
	var w_counter = 0;
	subs1.forEach(function(item, index){
		var node2 = item.replace(group1, group2);
		if(node.getName(node2)){
			var original_rect = BD2_createRectCoord(item);
			if(BD2_ApplyNodeQRectCoord(original_rect, node2)){
				n_counter++;
			}
		}
	});
	//update backdrops
	var bd1 = Backdrop.backdrops(group1);
	Print("Update Backdrops: ");
	Print(Backdrop.setBackdrops(group2, bd1));
	//update waypoints
	var wps1 = waypoint.getWaypointsInGroup(group1);
	wps1.forEach(function(item, index){
		var wp2 = item.replace(group1, group2);
		if(waypoint.setCoord(wp2, waypoint.coordX(item), waypoint.coordY(item))){
			w_counter++;
		}
	});
	
	Print("Update Node View Group - Nodes Coords updated: " + n_counter);
	Print("Update Node View Group - Waypoints Updates: " + w_counter);

}
exports.copyGroupsNodeviewCoords = copyGroupsNodeviewCoords;