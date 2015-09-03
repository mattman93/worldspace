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
      client.select(0, function(){ 
        client.lrange(username, 0, -1, function(err, res){
           if(res.length < 1){
             var msg = "we don't have a user by that name";
             socket.emit("err_login", msg);
           } else {
             if(res[1] == password) {
                 var msg = username;
                 socket.emit("logged_in", msg);
              } else {
                 var msg = "invalid credentials";
                 socket.emit("err_login", msg);
                }
           }
         });
        });
       });
       socket.on("register", function(username, password){
         client.select(0, function(){ 
        client.lrange(username, 0, -1, function(err, res){
          if(res == null || res.length == 0 || res == ""){
            client.rpush(username, username, password);
            var msg = "account created for " + username;
            socket.emit("account_created", msg);
          } else {
          var msg = "UserName has been taken";
            socket.emit("reg_err", msg);
          }
       });
      });
     });
      socket.on("submit_post", function(content, user, global_lat, global_longi, post_lat, post_long, post_address){
        client.select(1, function() {
        var key_to_store = post_lat.toString() + ":" + post_long.toString(); 
         client.lrange(key_to_store, 0, -1, function(err, result){
            if(result.length > 1){
              console.log(" There's already a post at " + post_address);
             //socket.emit("Loc_occupied", msg);
           } else {
         client.rpush(key_to_store, user, content, global_lat, global_longi, post_lat, post_long, post_address, function(err, reply) {
         client.lrange(key_to_store, 0, -1, function(err, res){
            if(res == null){
            //   socket.emit("posting error", msg);
           } else {
            var user_p = res[0];
            var content_p = res[1];
            var lat_p = res[4];
            var longi_p = res[5];
            var address_p = res[6];
            io.sockets.emit("add_post_to_map", user_p, content_p, lat_p, longi_p, address_p);
                }  
            });
          });
          }
        });
        });
      });
  socket.on("stats", function(user){
    var posts = 0;
       client.select(1, function() { 
          client.keys("*", function (err, all_keys) {  
            for(var i=0; i<all_keys.length; i++){   
               post_key = all_keys[i]; 
               client.lrange(post_key.toString(), 0, -1, function(err, res){
                if(res[0] == user){
                  posts++;
                  console.log(res[0]);
                }
               });
              } 
         });
          socket.emit("show_stats", posts);
        });
  });
   	socket.on("map-loaded", function(){
      console.log("client " + socket.id + " map loaded ");
        client.select(1, function() { 
          client.keys("*", function (err, all_keys) {  
            for(var i=0; i<all_keys.length; i++){   
               post_key = all_keys[i]; 
               client.lrange(post_key.toString(), 0, -1, function(err, res){
                socket.emit("send_posts", res); 
               });
              } 
         });
        });
      });
   	});
