window. onload = function ()
{
//other things
var targetFramePerSecond = 50;
var windowWidth = 0;
var windowHeight = 0;
var mainSize = 0;
var globalLeft = 0;

//from html
var canvas = document.getElementById("space");
var context = canvas.getContext("2d");

//robot info
var robots = [];
var robotRadius = 20;
var robotSpeed = 3000000;
var robotInitPower = 10000;
var beta = 45 * Math.PI/180;
var sensorRadius = 5;
var avoidSteps = 20;
var movementCostMultipler = 1.5;
var numOfRobot = 1;

//light info
var numOfLight = 3;
var lights = [];
var lightIntensity = 1;
var lightRadius = 50;
var teleTimer = 100;

//startUp
for(var i = 0; i < numOfRobot; i++)
{
	var ranX = Math.floor((Math.random() * (canvas.width-robotRadius)))+robotRadius;
	var ranY = Math.floor((Math.random() * (canvas.height-robotRadius)))+robotRadius;
	createRobot(ranX,ranY);
}
for(var i = 0; i < numOfLight; i++)
{
	var ranX = Math.floor((Math.random() * (canvas.width-lightRadius)))+lightRadius;
	var ranY = Math.floor((Math.random() * (canvas.height-lightRadius)))+lightRadius;
	createLight(ranX,ranY);
}

//game loop
function gameLoop(){
	sizeControl();
	drawAll();
	setTimeout(gameLoop, 1000/targetFramePerSecond);
}
gameLoop();

function drawAll()
{
	context.clearRect ( 0 , 0 , canvas.width, canvas.height );
	for(i = 0; i<robots.length; i++)
	{
		var r = robots[i];
		drawRobot(r);
		if(r.power>0)
		{
			updateRobot(r, i);
		}
	}
	for(i = 0; i<lights.length; i++)
	{
		drawLight(lights[i]);
		updateLight(lights[i]);
	}
}

function updateLight(light)
{
	light.timer -= 1;
	if(light.timer<0)
	{
		var ranX = Math.floor((Math.random() * (600-lightRadius)))+lightRadius;
		var ranY = Math.floor((Math.random() * (600-lightRadius)))+lightRadius;
		light.x = ranX;
		light.y = ranY;
		light.timer = teleTimer;
	}
}

function updateRobot(robot, index)
{
	var alpha = robot.alpha;
	var xs1 = robot.x+robotRadius*Math.cos(alpha+beta);
	var ys1 = robot.y+robotRadius*Math.sin(alpha+beta);
	var xs2 = robot.x+robotRadius*Math.sin(alpha+beta);
	var ys2 = robot.y-robotRadius*Math.cos(alpha+beta);
	var leftIntensity = 0;
	var rightIntensity = 0;
	var vl = 0;
	var vr = 0;
	var Power = robot.power;
	var status = robot.status;
	var aStep = robot.avoidStep;
	var Fit = robot.fitness;
	var X = robot.x;
	var Y = robot.y;
	for(i = 0; i<lights.length; i++)
	{
		var light = lights[i];
		var D = distance(light.x,light.y,X,Y);
		var Ds1 = distance(light.x,light.y,xs1,ys1);
		var A1 = (robotRadius*robotRadius + Ds1*Ds1)/(D*D);
		if(A1<=1)
		{
			leftIntensity += lightIntensity/(Ds1*Ds1);
			leftIntensity = (leftIntensity>1) ? 1:leftIntensity;
		}
		var Ds2 = distance(light.x,light.y,xs2,ys2);
		var A2 = (robotRadius*robotRadius + Ds2*Ds2)/(D*D);
		if(A2<=1)
		{
			rightIntensity += lightIntensity/(Ds2*Ds2);
			rightIntensity = (rightIntensity>1) ? 1:rightIntensity;
		}
	}
	var theta = Math.atan2(leftIntensity,rightIntensity);
	var normLeft = Math.sin(theta);
	var normRight = Math.cos(theta);
	leftIntensity = (lightIntensity*normLeft)/(D*D);
	rightIntensity = (lightIntensity*normRight)/(D*D);
	switch(status)
	{
		case "avoidance":
			if(aStep > 0)
			{
				aStep -= 1;
			}
			else
			{
				status = "normal";
			}
			vl = -1*robotSpeed/100000;
			vr = -1*robotSpeed/100000;
			break;
		default:
			var aiResult = AI(leftIntensity, rightIntensity);
			vl = aiResult[0]*robotSpeed;
			vr = aiResult[1]*robotSpeed;
	}
	var Vc = (vr + vl)/2;
	var omega = (vr - vl)/(2*robotRadius);
	alpha = alpha + (1/targetFramePerSecond)*omega;
	var xMovement = (1/targetFramePerSecond)*Vc*Math.cos(alpha);
	var yMovement = (1/targetFramePerSecond)*Vc*Math.sin(alpha);
	X = X + xMovement;
	Y = Y + yMovement;
	var powerCost = Math.abs(xMovement)+Math.abs(yMovement);
	Power -= powerCost*movementCostMultipler;
	if(Power<0)
	{
		Power = 0;
	}
	if(isCollideWithWall(robot) || isCollided(robot))
	{
		status = "avoidance";
		aStep = avoidSteps;
	}
	var powerCharge = Math.sqrt((leftIntensity*leftIntensity + rightIntensity*rightIntensity))*robotInitPower;
	Power += powerCharge;
	if(Power > robotInitPower)
	{
		Power = robotInitPower;
	}
	var newRobot = {x:X, y:Y, alpha:alpha, power:Power, status:status, avoidStep:aStep, fitness:Fit};
	robots[index] = newRobot;
}

function AI(leftInput, rightInput)
{
	var leftOutput = rightInput;
	var rightOutput = leftInput;
	return [leftOutput, rightOutput];
}

function isCollideWithWall(robot)
{
	var collided = false;
	if(robot.x>canvas.width-robotRadius)
	{
		robot.x = canvas.width-robotRadius;
		collided = true;
	}
	if(robot.x < robotRadius)
	{
		robot.x = robotRadius;
		collided = true;
	}
	if(robot.y < robotRadius)
	{
		robot.y = robotRadius;
		collided = true;
	}
	if(robot.y > canvas.height-robotRadius)
	{
		robot.y = canvas.height-robotRadius;
		collided = true;
	}
	return collided;
}

function isCollided(robot)
{
	var collided = false;
	for(i = 0; i<lights.length; i++)
	{
		collided = isCollideLight(robot, lights[i]);
	}
	// for(i = 0; i<robots.length; i++)
	// {
	// 	if(robot !== robots[i])
	// 	{
	// 		collided = areRobotsCollide(robot, robots[i]);
	// 	}
	// }
	return collided;
}

function isCollideLight(robot, light)
{
	var dx = robot.x - light.x;
	var dy = robot.y - light.y;
	var dist =  Math.sqrt(dx*dx + dy*dy);
	return dist<(robotRadius + lightRadius);
}

function areRobotsCollide(r1, r2)
{
	var dx = r1.x - r2.x;
	var dy = r1.y - r2.y;
	var dist =  Math.sqrt(dx*dx + dy*dy);
	return dist<(robotRadius*2);
}

function drawRobot(robot)
{
	var robot_gradient = context.createRadialGradient(robot.x,robot.y,robotRadius/3,robot.x,robot.y,robotRadius);
	var green = intToHex(255*(robot.power/robotInitPower));
	robot_gradient.addColorStop(0, "#00"+ green +"00");
	robot_gradient.addColorStop(1, "silver");
	context.fillStyle = robot_gradient;
	context.beginPath();
	context.arc(robot.x, robot.y, robotRadius, 0, 2*Math.PI);
	context.fill();

	var xs1 = robot.x+robotRadius*Math.cos(robot.alpha+beta);
	var ys1 = robot.y+robotRadius*Math.sin(robot.alpha+beta);
	var sensor_gradient = context.createRadialGradient(xs1, ys1,sensorRadius/3, xs1, ys1,sensorRadius);
	sensor_gradient.addColorStop(0, "white");
	sensor_gradient.addColorStop(1, "black");
	context.fillStyle = sensor_gradient;
	context.beginPath();
	context.arc(xs1, ys1, sensorRadius, 0, 2*Math.PI);
	context.fill();

	var xs2 = robot.x+robotRadius*Math.sin(robot.alpha+beta);
	var ys2 = robot.y-robotRadius*Math.cos(robot.alpha+beta);
	var sensor_gradient = context.createRadialGradient(xs2, ys2,sensorRadius/3, xs2, ys2,sensorRadius);
	sensor_gradient.addColorStop(0, "white");
	sensor_gradient.addColorStop(1, "black");
	context.fillStyle = sensor_gradient;
	context.beginPath();
	context.arc(xs2, ys2, sensorRadius, 0, 2*Math.PI);
	context.fill();
}

function drawLight(light)
{
	var light_gradient = context.createRadialGradient(light.x,light.y,lightRadius/3,light.x,light.y,lightRadius);
	light_gradient.addColorStop(0, "yellow");
	light_gradient.addColorStop(1, "white");
	context.fillStyle = light_gradient;
	context.beginPath();
	context.arc(light.x, light.y, lightRadius, 0, 2*Math.PI);
	context.fill();
}

function createRobot(pos_x, pos_y)
{
	var robot = {x:pos_x, y:pos_y, alpha:0, power:robotInitPower, status:"normal", avoidStep:0, fitness:0};
	robots[robots.length] = robot;
}

function createLight(pos_x, pos_y)
{
	var light = {x:pos_x, y:pos_y, timer:teleTimer};
	lights[lights.length] = light;
}

function distance(ax, ay, bx, by)
{
	return Math.sqrt((ax-bx)*(ax-bx)+(ay-by)*(ay-by));
}

function intToHex(i)
{
	var output = parseInt(i).toString(16);
	return (output.length==1) ? "0"+output : output;
}

function sizeControl()
{
	windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    if(windowWidth>windowHeight)
    {
		mainSize = windowHeight*0.885;
    }
    else
    {
    	mainSize = windowWidth*0.885;
    }
    globalLeft = (windowWidth-mainSize)/2;
    canvas.style.height=mainSize+"px";
    canvas.style.width=mainSize+"px";
	canvas.style.left=globalLeft+"px";
}
}