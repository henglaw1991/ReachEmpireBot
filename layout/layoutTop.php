 <!DOCTYPE html>
 <html lang="zxx">
 <!--<< Head Area >>-->
 <?php include './partials/head.php' ?>

 <body>
 <div class="boxed_wrapper ltr <?php echo (isset($themeMode) && $themeMode) ? 'dark_home' : ''; ?>">

         <!-- Preloader -->
         <?php include './partials/preloader.php' ?>

         <!-- page-direction -->
         <?php include './partials/pagedirection.php' ?>

         <!--Search Popup-->
         <?php include './partials/searchPopup.php' ?>
 
<!-- Main Header -->
<?php 
        // Get the current page filename without extension
         
        
        switch ($page) {
            case 'header1':
                include './partials/header.php';
                break;
            case 'header2':
                include './partials/header-2.php';
                break;
            case 'header3':
                include './partials/header-3.php';
                break;
            case 'header4':
                include './partials/header-4.php';
                break;
            case 'header5':
                include './partials/header-5.php';
                break;
            
            default:
                '';
        }
        ?>
        <!-- Main Header End -->
         <!-- Mobile Menu -->
         <?php include './partials/MobileMenu.php' ?>
         <!-- End Mobile Menu -->