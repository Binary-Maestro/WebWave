document.addEventListener("DOMContentLoaded", function() {
    var featuredImages = document.querySelectorAll('.featured_image');

    featuredImages.forEach(function(featured_image) {
        var imgUrl = featured_image.getAttribute('img-url');
        if(imgUrl == '' || imgUrl == undefined) return;
        featured_image.style.backgroundImage = 'url("' + imgUrl + '")';
    });

    var date = document.querySelectorAll('.date');
    date.forEach(function(del) {
        var dateel = del.getAttribute('dateformat');

        var datefrmt = new Date(dateel * 1000);
        var formattedDate = datefrmt.toLocaleString();
        console.log(formattedDate)
        del.textContent = formattedDate;
    });
});
