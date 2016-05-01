# termconv

## Import

$ node import.js


## Frontend

start web server in termconv dir with  
`$ python -m SimpleHTTPServer`

start chrome with  
`$ ChromeApplication --disable-web-security --user-data-dir=/path/to/termconv/ http://localhost:8000/search.html`


## Reporting Problems

It's best to write a failing test if you find an issue.  I will always
accept pull requests with failing tests if they demonstrate intended
behavior, but it is very hard to figure out what issue you're describing
without a test.  
Writing a test is also the best way for you yourself to figure out if
you really understand the issue you think you have.
