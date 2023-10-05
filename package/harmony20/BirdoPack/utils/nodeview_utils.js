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
	var w_delete_counter = 0;

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
	var wps2 = waypoint.getWaypointsInGroup(group2);
	wps2.forEach(function(item, index){//remove waypoints
		var wp1 = item.replace(group2, group1);
		if(wps1.indexOf(wp1) == -1){
			waypoint.deleteWaypoint(item);
			w_delete_counter++;
		}
	});

	wps1.forEach(function(item, index){//create waypoints
		var wp2 = item.replace(group1, group2);
		if(wps2.indexOf(wp2) == -1){
			waypoint.add(group2,  item.replace(group1 + "/", ""), 0, 0);
			var portsChild = waypoint.childInports(item);
			var nodesChild = waypoint.childNodes(item);
			var portNode = waypoint.parentNode(item);
			var portOut = waypoint.parentOutport(item);
			waypoint.linkOutportToWaypoint(portNode.replace(group1, group2), portOut, wp2);
			nodesChild.forEach(function(nChild, index){
				waypoint.linkWaypointToInport(wp2, nChild.replace(group1, group2), portsChild[index], false);
			});
		}
		if(waypoint.setCoord(wp2, waypoint.coordX(item), waypoint.coordY(item))){
			w_counter++;
		}
	});
	
	Print("Nodes Coords updated: " + n_counter);
	Print("Waypoints Updates: " + w_counter);
	Print("Waypoints deleted: " + w_delete_counter);
}
exports.copyGroupsNodeviewCoords = copyGroupsNodeviewCoords;