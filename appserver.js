var server = require('http').createServer(
  function(request, response){
      fs.readFile(__dirname + '/index.html',
        function(err, data){
          if(err){
            response.writeHead(500);
            return response.end('error');
          } else {
          response.writeHead(200);
          response.end(data);
        }
      });
  }
);
var io = require('socket.io').listen(server);
var fs = require('fs');
var express = require('express');
var path = require('path');
var url = require('url');
var redis = require('redis');
var client = redis.createClient(6379, '45.55.64.16');
var app = express();

server.listen(8080);
client.on('connect', function(){
  console.log("connected");
});

function makeSessionSecret()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^^&*()_+";

    for( var i=0; i < 14; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
     io.sockets.on('connection', function(socket){
       socket.on("login", function(username, password){
        client.lrange(username, 0, -1, function(err, res){
           if(res == null){
             var msg = "we don't have a user by that name";
             socket.emit("err_login", msg);
           } else {
             if(res[1] == password){
             var msg = username;
             socket.emit("logged_in", msg);
           } else {
             var msg = "invalid credentials";
             socket.emit("err_login", msg);
            }
           }
         });
       });
       socket.on("register", function(username, password, email){
        client.lrange(username, 0, -1, function(err, res){
          console.log(username);
          console.log(password);
          console.log(email);
          if(res == null || res.length == 0 || res == ""){
            client.rpush(username, username, password, email);
            var msg = "account created for " + username;
            socket.emit("account_created", msg);
          } else {
          var msg = "UserName has been taken";
            socket.emit("reg_err", msg);
          }
       });
     });
      socket.on("submit_post", function(content, user, global_lat, global_longi, post_lat, post_long, post_address){
         client.rpush(post_address, user, content, global_lat, global_longi, post_lat, post_long);
         client.lrange(post_address, 0, -1, function(err, res){
            if(res == null){
             console("There was an error with your post, please try again");
          //   socket.emit("posting error", msg);
           } else {
            var user_p = res[0];
            var content_p = res[1];
            var lat_p = res[4];
            var longi_p = res[5];
            var address_p = post_address;
            socket.emit("add_post_to_map", user_p, content_p, lat_p, longi_p, address_p);
           }
         });
    
      });
   	  socket.on("map-loaded", function(){
        console.log("client " + socket.id + " map loaded ");
      });
   	});
