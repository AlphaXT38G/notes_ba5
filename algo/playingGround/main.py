import numpy as np

if __name__ == "__main__":
    def partition(A, p, r):
        x = A[r] # pivot
        i = p - 1

        for j in range(p, r):
            if A[j] <= x:
                i += 1
                A[i], A[j] = A[j], A[i]

        A[i + 1], A[r] = A[r], A[i + 1]
        return i + 1


    def quickSort(A, p, r):
        if p < r:
            q = partition(A, p, r)
            quickSort(A, p, q - 1)
            quickSort(A, q + 1, r)

    print("="*50)
    print("Lets sort the following list using quick sort:")
    A = np.array([5, 8, 4, 7, 1, 2, 3, 6])
    quickSort(A, 0, len(A) - 1)
    print(A)
    print("="*50)
