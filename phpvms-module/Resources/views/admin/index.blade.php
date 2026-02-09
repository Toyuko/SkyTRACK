@extends('admin.layouts.app')

@section('title', 'SkyNet ACARS')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">SkyNet ACARS Dashboard</h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="info-box">
                                <span class="info-box-icon bg-info"><i class="fas fa-plane"></i></span>
                                <div class="info-box-content">
                                    <span class="info-box-text">Active Flights</span>
                                    <span class="info-box-number">{{ \Modules\SkyNetAcars\Models\AcarsFlight::where('status', 'active')->count() }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="info-box">
                                <span class="info-box-icon bg-success"><i class="fas fa-check-circle"></i></span>
                                <div class="info-box-content">
                                    <span class="info-box-text">Completed Flights</span>
                                    <span class="info-box-number">{{ \Modules\SkyNetAcars\Models\AcarsFlight::where('status', 'completed')->count() }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="info-box">
                                <span class="info-box-icon bg-primary"><i class="fas fa-map-marker-alt"></i></span>
                                <div class="info-box-content">
                                    <span class="info-box-text">Total Positions</span>
                                    <span class="info-box-number">{{ \Modules\SkyNetAcars\Models\AcarsPosition::count() }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="info-box">
                                <span class="info-box-icon bg-warning"><i class="fas fa-cog"></i></span>
                                <div class="info-box-content">
                                    <span class="info-box-text">Module Status</span>
                                    <span class="info-box-number">
                                        @if(config('skynet-acars.enabled'))
                                            <span class="badge badge-success">Enabled</span>
                                        @else
                                            <span class="badge badge-danger">Disabled</span>
                                        @endif
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row mt-4">
                        <div class="col-md-12">
                            <h4>Quick Actions</h4>
                            <a href="{{ route('admin.skynet-acars.settings') }}" class="btn btn-primary">
                                <i class="fas fa-cog"></i> Settings
                            </a>
                            <a href="{{ route('admin.skynet-acars.data') }}" class="btn btn-info">
                                <i class="fas fa-database"></i> View ACARS Data
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
