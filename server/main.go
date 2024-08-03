package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"sync/atomic"
)

var (
	fileName atomic.Pointer[string]
	signal   = make(chan struct{}, 1)
)

func main() {
	listenPort := os.Getenv("PORT")
	if listenPort == "" {
		listenPort = "3000"
	}
	http.HandleFunc("/getData", handle)

	go func() {
		log.Fatal(http.ListenAndServe(":"+listenPort, nil))
	}()

	log.Printf("Server listening on port %s\n", listenPort)

	for {
		var input string
		fmt.Print("Enter file name: ")
		_, err := fmt.Scanln(&input)
		if err != nil {
			log.Println(err)
			return
		}

		if !strings.HasSuffix(input, ".mhtml") {
			input += ".mhtml"
		}

		fileName.Store(&input)
		fmt.Printf("Set file name to %s\n", input)

		<-signal
	}
}

func handle(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
	w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodGet {
		if fileName.Load() != nil {
			w.WriteHeader(http.StatusAccepted)
		} else {
			w.WriteHeader(http.StatusOK)
			log.Println("get request but not saved yet")
		}
	} else if r.Method == http.MethodPut {
		getData := fileName.Load()
		if getData != nil && fileName.CompareAndSwap(getData, nil) {
			signal <- struct{}{}
			saveData(*getData, r.Body)
		} else {
			w.WriteHeader(http.StatusNotModified)
		}
	} else if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func saveData(filename string, body io.Reader) {
	// save data
	f, err := os.Create(filename)
	if err != nil {
		log.Println(err)
		return
	}

	_, err = io.Copy(f, body)
	if err != nil {
		log.Println(err)
		return
	}

	absPath, _ := os.Getwd()
	absPath = path.Join(absPath, filename)

	err = f.Close()
	if err != nil {
		log.Println(err)
		return
	}

	log.Printf("File %s saved", absPath)
}
