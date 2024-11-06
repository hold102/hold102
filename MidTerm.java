import java.util.Scanner;

public class MidTerm {
    public static void main(String[] args) {
         Scanner keyboard = new Scanner(System.in);

        int x , y;
        String move ;
        System.out.println("Enter the coordinate X and Y: ");

        x = keyboard.nextInt();
        y = keyboard.nextInt();

        System.out.println("Enter the move: ");
        move = keyboard.next();
        move = move.toUpperCase();

        System.out.println("Initial Coordinate (" + x + ","+ y +")");


        for (int i = 0 ; i < move.length(); i ++){
            char move2 = move.charAt(i); // character at the string

            if (move2 == 'L'){
                x--; // Going left

            }
            else if  (move2 == 'R'){
                x++;

            }
            else if  (move2 == 'U'){
                y++;
            }

            else if (move2 == 'D'){
                y--;
            }
            else
                continue; // good code insight
        }
        System.out.println("Final Coordinate " + "(" + x + ","+ y + ")");
        // please take note that string usually come with index of zero.


// 2)       Scanner keyboard = new Scanner(System.in);
//        double price, cumulative = 0, sales , total;
//        String durian;
//
//        do {
//            System.out.print("Enter the type of durian [Quit] to terminate: ");
//            durian = keyboard.next();
//            if (durian.equalsIgnoreCase("quit")){
//                break;
//            } // terminate the program loop
//
//            System.out.print("Enter the sales in kg: ");
//            sales = keyboard.nextDouble();
//            if (durian.equalsIgnoreCase("MK")) {
//                price = 25.0;
//                total = price * sales;
//                cumulative = cumulative + total;
//
//            }
//            else if (durian.equalsIgnoreCase("HL")) {
//                price = 22.0;
//                total = price * sales;
//                cumulative = cumulative + total;}
//
//
//            else if (durian.equalsIgnoreCase("D24")) {
//                    price = 20.0;
//                    total = price * sales;
//                    cumulative = cumulative + total;
//
//                }
//
//            else if (durian.equalsIgnoreCase("UM")){
//                price = 18.0;
//                total = price * sales;
//                cumulative = cumulative + total;
//            }
//            else
//                continue;
//
//            } while(!durian.equalsIgnoreCase("quit")); // while durian is not equal to quit then run the loop.
//
//        System.out.printf("Total sales: %.2f" ,cumulative);

    }
}


