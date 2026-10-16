package main

import "fmt"

func celsiusToFahrenheit(celsius float64) float64 {
	return  celsius*(9.0/5.0) + 32
}

func remainingRequests(limit int, used int) int  {
	remaining := limit - used

	if remaining < 0 {
		return 0
	}

	return  remaining
}

	func main() {
		

		fmt.Println("First:", remainingRequests(10, 7))
		fmt.Println("Second:", remainingRequests(10, 12))

	}