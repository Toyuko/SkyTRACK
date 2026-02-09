@extends('admin.layouts.app')

@section('title', 'SkyNet ACARS Data')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">ACARS Flight Data</h3>
                </div>
                <div class="card-body">
                    <table class="table table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Callsign</th>
                                <th>Route</th>
                                <th>Simulator</th>
                                <th>Started</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($flights as $flight)
                                <tr>
                                    <td>{{ $flight->id }}</td>
                                    <td>{{ $flight->user->name ?? 'N/A' }}</td>
                                    <td>{{ $flight->callsign }}</td>
                                    <td>{{ $flight->departure_icao }} → {{ $flight->arrival_icao }}</td>
                                    <td>{{ $flight->simulator }}</td>
                                    <td>{{ $flight->started_at ? $flight->started_at->format('Y-m-d H:i:s') : 'N/A' }}</td>
                                    <td>
                                        @if($flight->status === 'active')
                                            <span class="badge badge-success">Active</span>
                                        @elseif($flight->status === 'completed')
                                            <span class="badge badge-info">Completed</span>
                                        @else
                                            <span class="badge badge-danger">Cancelled</span>
                                        @endif
                                    </td>
                                    <td>
                                        <a href="{{ route('admin.skynet-acars.data.show', $flight->id) }}" 
                                           class="btn btn-sm btn-info">
                                            <i class="fas fa-eye"></i> View
                                        </a>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="8" class="text-center">No ACARS flights found</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>

                    <div class="d-flex justify-content-center">
                        {{ $flights->links() }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
