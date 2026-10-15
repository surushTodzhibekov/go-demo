package main

import "fmt"

	func main() {
		total := 0
		for i := 0; i <= 10; i++ {
			if i % 3 == 0 {
				continue
			}else {
				fmt.Println("Accepted request:", i)
				total++
			}

			if total == 4 {
				break
			}
			
		}

		fmt.Println("Total accepted:", total)
	}