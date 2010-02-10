
addInitEvent(function(){

console.dir(slinks);

    // Status toggle
    var slinks = getElementsByClass('plugin_do_status',null,'a');
    for(var i=0; i<slinks.length; i++){
        addEvent(slinks[i],'click',function(e){
            var me = e.target;
            if(me.tagName != 'A') me = e.target.parentNode;
            var param = me.search.substring(1).replace(/&do=/,'&call=');


            var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
            if(ajax.failed) return true;

            ajax._image = me.firstChild;
            ajax._image.src = DOKU_BASE+'lib/plugins/do/pix/throbber.gif';
            ajax._image.title = '...';

            ajax.onCompletion = function(){
                var resp = this.response;
                if(resp){
                    this._image.src   = DOKU_BASE+'lib/plugins/do/pix/status_done.png';
                    this._image.title = LANG['plugins']['do']['done'].replace(/%s/,resp);
                }else{
                    this._image.src   = DOKU_BASE+'lib/plugins/do/pix/status_open.png';
                    this._image.title = LANG['plugins']['do']['open'];
                }
            }

            ajax.runAJAX(param);


            e.preventDefault();
            e.stopPropagation();
            return false;
        });

    }
});

