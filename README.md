
# Repo containing the files for the frontend  Medium tutorial "Turning a Raspberry Pi 3B+ into a powerful object recognition edge server with Intel Movidius NCS2" 

more info: https://medium.com/p/8dcfebebb2d6

* copyright MIT license
* made at FIR an der RWTH Aachen www.fir.de

# requirements

* python3

# use instructions
Change the raspberry url in file js/main.js in line 168:

~~~
url: "http://192.168.0.2:5000/"
~~~

Start the frontend with
```
sh RUN.sh 
```

Then open your browser at  

[localhost:8000](http://localhost:8000)